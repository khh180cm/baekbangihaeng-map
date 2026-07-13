import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import polylabel from 'polylabel';
import { canonicalSido, type Sido } from '../src/lib/sido';

// 다각형 내부에서 경계로부터 가장 먼 지점(pole of inaccessibility) = 라벨 최적 위치.
// MultiPolygon(육지+섬)은 가장 넓은 폴리곤을 골라 그 안에 라벨을 둔다.
function ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}
function largestPolygon(geom: any): number[][][] {
  if (geom.type === 'Polygon') return geom.coordinates;
  let best = geom.coordinates[0];
  let bestA = -1;
  for (const poly of geom.coordinates) {
    const a = ringArea(poly[0]);
    if (a > bestA) { bestA = a; best = poly; }
  }
  return best;
}
function labelPointOf(geom: any): [number, number] {
  const p = polylabel(largestPolygon(geom), 0.005);
  return [Number(p[0].toFixed(5)), Number(p[1].toFixed(5))];
}

// 2018 southkorea-maps 검증된 스키마
const PROP = {
  provincesObject: 'skorea_provinces_2018_geo',
  municipalitiesObject: 'skorea_municipalities_2018_geo',
  submunicipalitiesObject: 'skorea_submunicipalities_2018_geo',
  code: 'code',
  name: 'name',
};

const readTopo = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const toFC = (topo: any, objName: string) => feature(topo, topo.objects[objName]) as any;

const sidoCodeOf = (code: string) => String(code).slice(0, 2);
const sigunguCodeOf = (code: string) => String(code).slice(0, 5);

mkdirSync('public/geo/sigungu', { recursive: true });
mkdirSync('public/geo/emd', { recursive: true });

// --- 시도 ---
const provFC = toFC(readTopo('scripts/raw/provinces.topojson.json'), PROP.provincesObject);
const sidoNameByCode = new Map<string, Sido>();
for (const f of provFC.features) {
  const code = sidoCodeOf(f.properties[PROP.code]);
  const sido = canonicalSido(f.properties[PROP.name]);
  if (!sido) throw new Error(`Unknown sido: ${f.properties[PROP.name]}`);
  const labelPoint = labelPointOf(f.geometry);
  f.properties = { sidoCode: code, sido, labelPoint };
  sidoNameByCode.set(code, sido);
}
writeFileSync('public/geo/sido.json', JSON.stringify(provFC));
writeFileSync(
  'public/geo/sido-index.json',
  JSON.stringify([...sidoNameByCode].map(([sidoCode, sido]) => ({ sidoCode, sido }))),
);

// --- 시군구 (+ centroid fallback) ---
const muniFC = toFC(readTopo('scripts/raw/municipalities.topojson.json'), PROP.municipalitiesObject);
const sigunguNameByCode = new Map<string, string>();
const sigunguBySido = new Map<string, any[]>();
const sigunguCentroids: Array<{ sido: Sido; sigungu: string; lng: number; lat: number }> = [];
for (const f of muniFC.features) {
  const raw = String(f.properties[PROP.code]);
  const sidoCode = sidoCodeOf(raw);
  const sigunguCode = sigunguCodeOf(raw);
  const sido = sidoNameByCode.get(sidoCode)!;
  const sigungu = f.properties[PROP.name];
  const [lng, lat] = geoCentroid(f);
  sigunguCentroids.push({ sido, sigungu, lng, lat });
  sigunguNameByCode.set(sigunguCode, sigungu);
  f.properties = { sidoCode, sigunguCode, sido, sigungu };
  if (!sigunguBySido.has(sidoCode)) sigunguBySido.set(sidoCode, []);
  sigunguBySido.get(sidoCode)!.push(f);
}
for (const [sidoCode, features] of sigunguBySido) {
  writeFileSync(`public/geo/sigungu/${sidoCode}.json`, JSON.stringify({ type: 'FeatureCollection', features }));
}
writeFileSync('public/geo/sigungu-centroids.json', JSON.stringify(sigunguCentroids));

// --- 읍면동(행정동) + centroid ---
const emdFC = toFC(readTopo('scripts/raw/submunicipalities.topojson.json'), PROP.submunicipalitiesObject);
const emdBySido = new Map<string, any[]>();
const centroids: Array<{ sido: Sido; sigungu: string; emd: string; lng: number; lat: number }> = [];
for (const f of emdFC.features) {
  const raw = String(f.properties[PROP.code]);
  const sidoCode = sidoCodeOf(raw);
  const sigunguCode = sigunguCodeOf(raw);
  const sido = sidoNameByCode.get(sidoCode)!;
  const sigungu = sigunguNameByCode.get(sigunguCode) ?? '';
  const emd = f.properties[PROP.name];
  f.properties = { sidoCode, sigunguCode, emdCode: raw, sido, sigungu, emd };
  const [lng, lat] = geoCentroid(f);
  centroids.push({ sido, sigungu, emd, lng, lat });
  if (!emdBySido.has(sidoCode)) emdBySido.set(sidoCode, []);
  emdBySido.get(sidoCode)!.push(f);
}
for (const [sidoCode, features] of emdBySido) {
  writeFileSync(`public/geo/emd/${sidoCode}.json`, JSON.stringify({ type: 'FeatureCollection', features }));
}
writeFileSync('public/geo/emd-centroids.json', JSON.stringify(centroids));

console.log(`geo build done: ${sidoNameByCode.size} sido, ${sigunguCentroids.length} sigungu, ${centroids.length} emd centroids`);
