import { readFileSync } from 'node:fs';
import { geoContains } from 'd3-geo';
import type { Restaurant } from '../src/types';

const sido = JSON.parse(readFileSync('public/geo/sido.json', 'utf8'));
const featBySido = new Map<string, any>();
for (const f of sido.features) featBySido.set(f.properties.sido, f);

const list = JSON.parse(readFileSync('public/data/restaurants.json', 'utf8')) as Restaurant[];

let inside = 0;
let outside = 0;
const mismatches: Array<{ name: string; assigned: string; actual: string; addr: string }> = [];

for (const r of list) {
  if (!r.coord) continue;
  const pt: [number, number] = [r.coord.lng, r.coord.lat];
  const assigned = featBySido.get(r.region.sido);
  const ok = assigned && geoContains(assigned, pt);
  if (ok) { inside++; continue; }
  outside++;
  // 실제로 이 좌표를 포함하는 시/도 찾기
  let actual = '(없음/바다)';
  for (const f of sido.features) {
    if (geoContains(f, pt)) { actual = f.properties.sido; break; }
  }
  if (mismatches.length < 25) mismatches.push({ name: r.name, assigned: r.region.sido, actual, addr: r.address });
}

console.log(`총 ${list.length}곳 중 좌표 있음: ${inside + outside}`);
console.log(`배정 시/도 경계 안: ${inside} (${((inside / (inside + outside)) * 100).toFixed(1)}%)`);
console.log(`경계 밖(불일치): ${outside}`);
if (mismatches.length) {
  console.log('\n--- 불일치 예시 ---');
  for (const m of mismatches) console.log(`  ${m.name}: 배정=${m.assigned} / 실제=${m.actual} / ${m.addr}`);
}

// 강화 케이스 확인
console.log('\n--- 강화 관련 식당 (배정 시/도 확인) ---');
const ghwa = list.filter((r) => r.address.includes('강화'));
for (const r of ghwa.slice(0, 8)) {
  const f = featBySido.get(r.region.sido);
  const ok = r.coord && f && geoContains(f, [r.coord.lng, r.coord.lat]);
  console.log(`  ${r.name} | 배정=${r.region.sido} | 좌표∈경계=${ok} | ${r.address}`);
}
console.log(`강화 식당 수: ${ghwa.length}, 모두 인천 배정? ${ghwa.every((r) => r.region.sido === '인천광역시')}`);
