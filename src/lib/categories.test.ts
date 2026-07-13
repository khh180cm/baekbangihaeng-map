import { describe, it, expect } from 'vitest';
import { CATEGORIES, categoryIcon } from './categories';

describe('categories', () => {
  it('includes 기타 as fallback category', () => {
    expect(CATEGORIES).toContain('기타');
  });
  it('returns an icon for every category', () => {
    for (const c of CATEGORIES) {
      expect(categoryIcon(c)).toBeTruthy();
    }
  });
});
