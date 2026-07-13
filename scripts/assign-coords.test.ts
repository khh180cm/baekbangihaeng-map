import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Restaurant } from '../src/types';

// public/data/restaurants.json 은 `npm run assign:coords`(또는 `npm run data`)로 생성된다.
describe('assign-coords output artifact', () => {
  const list = JSON.parse(readFileSync('public/data/restaurants.json', 'utf8')) as Restaurant[];

  it('has links filled with keyless naver/kakao search URLs', () => {
    for (const r of list) {
      expect(r.links.naver).toContain('map.naver.com');
      expect(r.links.kakao).toContain('map.kakao.com');
    }
  });

  it('resolves coords for most records within Korea bbox', () => {
    const withCoord = list.filter((r) => r.coord !== null);
    expect(withCoord.length).toBeGreaterThanOrEqual(Math.ceil(list.length * 0.8));
    for (const r of withCoord) {
      expect(r.coord!.lat).toBeGreaterThan(33);
      expect(r.coord!.lat).toBeLessThan(39.5);
      expect(r.coord!.lng).toBeGreaterThan(124);
      expect(r.coord!.lng).toBeLessThan(132);
    }
  });
});
