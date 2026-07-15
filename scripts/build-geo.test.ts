import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { inKoreaBbox } from '../src/lib/koreaBounds';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

// public/geo/* 는 `npm run build:geo`(또는 `npm run data`)로 생성된다.
describe('build-geo output artifacts', () => {
  it('emits 17 sido features with canonical names and 2-digit codes', () => {
    const fc = read('public/geo/sido.json');
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features.length).toBe(17);
    for (const f of fc.features) {
      expect(f.properties.sido).toBeTruthy();
      expect(f.properties.sidoCode).toMatch(/^\d{2}$/);
    }
  });

  it('each sido feature carries an interior labelPoint within Korea bbox', () => {
    const fc = read('public/geo/sido.json');
    for (const f of fc.features) {
      const [lng, lat] = f.properties.labelPoint;
      expect(inKoreaBbox(lat, lng)).toBe(true);
    }
  });

  it('writes per-sido emd files matching sido-index', () => {
    const index = read('public/geo/sido-index.json') as Array<{ sidoCode: string }>;
    for (const { sidoCode } of index) {
      expect(existsSync(`public/geo/emd/${sidoCode}.json`)).toBe(true);
    }
  });
});
