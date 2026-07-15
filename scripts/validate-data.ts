import { readFileSync } from 'node:fs';
import type { Restaurant } from '../src/types';
import { CATEGORIES } from '../src/lib/categories';
import { inKoreaBbox } from '../src/lib/koreaBounds';

const path = process.argv[2] ?? 'public/data/restaurants.json';
const list = JSON.parse(readFileSync(path, 'utf8')) as Restaurant[];
const errors: string[] = [];

const ids = new Set<string>();
for (const r of list) {
  if (!r.id || ids.has(r.id)) errors.push(`bad/duplicate id: ${r.id}`);
  ids.add(r.id);
  if (!r.name) errors.push(`${r.id}: missing name`);
  if (!r.region?.sido || !r.region?.sigungu || !r.region?.emd) errors.push(`${r.id}: incomplete region`);
  if (!(CATEGORIES as readonly string[]).includes(r.category)) errors.push(`${r.id}: bad category ${r.category}`);
  if (!r.links?.naver?.includes('map.naver.com')) errors.push(`${r.id}: bad naver link`);
  if (!r.links?.kakao?.includes('map.kakao.com')) errors.push(`${r.id}: bad kakao link`);
  if (r.coord && !inKoreaBbox(r.coord.lat, r.coord.lng)) errors.push(`${r.id}: coord out of Korea bbox`);
}

if (errors.length) {
  console.error('validate-data FAILED:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`validate-data OK: ${list.length} records`);
