import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseAddress } from '../src/lib/addressParser';
import { buildMapLinks } from '../src/lib/mapLinks';
import { resolveCentroid, jitter, type CentroidRow, type SigunguRow } from '../src/geo/centroid';
import type { Restaurant } from '../src/types';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) throw new Error('usage: assign-coords <in.json> <out.json>');
mkdirSync(dirname(outPath), { recursive: true });

const list = JSON.parse(readFileSync(inPath, 'utf8')) as Restaurant[];
const emdIndex = JSON.parse(readFileSync('public/geo/emd-centroids.json', 'utf8')) as CentroidRow[];
const sigunguIndex = JSON.parse(readFileSync('public/geo/sigungu-centroids.json', 'utf8')) as SigunguRow[];

let emdMatched = 0;
let sigunguMatched = 0;
let unmatched = 0;

const out: Restaurant[] = list.map((r) => {
  const parsed = parseAddress(r.address);
  let coord: Restaurant['coord'] = null;
  let confidence = r.confidence;

  if (parsed) {
    const hit = resolveCentroid(emdIndex, sigunguIndex, parsed);
    if (hit) {
      coord = jitter(hit.coord, r.id);
      if (hit.level === 'emd') emdMatched++;
      else { sigunguMatched++; confidence = 'medium'; }
    } else {
      unmatched++;
      confidence = 'low';
    }
  } else {
    unmatched++;
    confidence = 'low';
  }

  return {
    ...r,
    coord,
    confidence,
    links: buildMapLinks(r.name, r.region.sigungu),
  };
});

writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(
  `assign-coords: ${emdMatched} emd + ${sigunguMatched} sigungu = ${emdMatched + sigunguMatched}/${list.length} matched, ${unmatched} unmatched -> ${outPath}`,
);
