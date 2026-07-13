import { describe, it, expect } from 'vitest';
import { canonicalSido, SIDO_LIST } from './sido';

describe('canonicalSido', () => {
  it('normalizes short, long and legacy names to one canonical value', () => {
    expect(canonicalSido('서울')).toBe('서울특별시');
    expect(canonicalSido('서울특별시')).toBe('서울특별시');
    expect(canonicalSido('강원')).toBe('강원특별자치도');
    expect(canonicalSido('강원도')).toBe('강원특별자치도');
    expect(canonicalSido('전라북도')).toBe('전북특별자치도');
    expect(canonicalSido('제주')).toBe('제주특별자치도');
  });
  it('returns null for unknown', () => {
    expect(canonicalSido('없는도')).toBeNull();
  });
  it('SIDO_LIST has 17 entries', () => {
    expect(SIDO_LIST.length).toBe(17);
  });
});
