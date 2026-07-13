import { describe, it, expect } from 'vitest';
import seed from './restaurants.seed.json';
import type { Restaurant } from '../types';
import { CATEGORIES } from '../lib/categories';

describe('seed data', () => {
  const list = seed as unknown as Restaurant[];

  it('has at least 12 restaurants across >= 3 sido', () => {
    expect(list.length).toBeGreaterThanOrEqual(12);
    const sido = new Set(list.map((r) => r.region.sido));
    expect(sido.size).toBeGreaterThanOrEqual(3);
  });

  it('every record has required fields and a valid category', () => {
    for (const r of list) {
      expect(r.id).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r.region.sido && r.region.sigungu && r.region.emd).toBeTruthy();
      expect(r.address).toBeTruthy();
      expect(Array.isArray(r.menus)).toBe(true);
      expect(CATEGORIES).toContain(r.category);
    }
  });

  it('has unique ids', () => {
    const ids = list.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
