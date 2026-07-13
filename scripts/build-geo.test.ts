import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

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

  it('emd centroids are within Korea bbox', () => {
    const centroids = read('public/geo/emd-centroids.json') as Array<{ lng: number; lat: number }>;
    expect(centroids.length).toBeGreaterThan(1000);
    for (const c of centroids) {
      expect(c.lng).toBeGreaterThan(124);
      expect(c.lng).toBeLessThan(132);
      expect(c.lat).toBeGreaterThan(33);
      expect(c.lat).toBeLessThan(39.5);
    }
  });

  it('emits ~250 sigungu centroids within Korea bbox', () => {
    const rows = read('public/geo/sigungu-centroids.json') as Array<{ sido: string; sigungu: string; lng: number; lat: number }>;
    expect(rows.length).toBeGreaterThanOrEqual(240);
    for (const r of rows) {
      expect(r.sido && r.sigungu).toBeTruthy();
      expect(r.lng).toBeGreaterThan(124);
      expect(r.lat).toBeGreaterThan(33);
    }
  });

  it('writes per-sido emd files matching sido-index', () => {
    const index = read('public/geo/sido-index.json') as Array<{ sidoCode: string }>;
    for (const { sidoCode } of index) {
      expect(existsSync(`public/geo/emd/${sidoCode}.json`)).toBe(true);
    }
  });
});
