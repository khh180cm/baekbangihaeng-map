import { describe, it, expect } from 'vitest';
import { filterRestaurants, EMPTY_FILTER, type FilterState } from './filter';
import type { Restaurant } from '../types';

const make = (over: Partial<Restaurant>): Restaurant => ({
  id: 'x', name: '식당', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' },
  address: '', coord: null, menus: [], signatureMenu: null, category: '한식',
  episode: { season: 1, no: null, airDate: null }, links: { naver: '', kakao: '' },
  confidence: 'high', sources: [], ...over,
});

describe('filterRestaurants', () => {
  const list = [
    make({ id: 'a', name: '국밥집', category: '한식', episode: { season: 1, no: null, airDate: null } }),
    make({ id: 'b', name: '물회집', category: '해산물', episode: { season: 2, no: null, airDate: null } }),
    make({ id: 'c', name: '국수집', category: '면', menus: ['잔치국수'], episode: { season: 2, no: null, airDate: null } }),
  ];

  it('returns all with EMPTY_FILTER', () => {
    expect(filterRestaurants(list, EMPTY_FILTER)).toHaveLength(3);
  });
  it('filters by category', () => {
    const f: FilterState = { ...EMPTY_FILTER, category: '해산물' };
    expect(filterRestaurants(list, f).map((r) => r.id)).toEqual(['b']);
  });
  it('filters by season', () => {
    const f: FilterState = { ...EMPTY_FILTER, season: 2 };
    expect(filterRestaurants(list, f).map((r) => r.id)).toEqual(['b', 'c']);
  });
  it('matches query against name and menus', () => {
    expect(filterRestaurants(list, { ...EMPTY_FILTER, query: '국' }).map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterRestaurants(list, { ...EMPTY_FILTER, query: '잔치' }).map((r) => r.id)).toEqual(['c']);
  });
});
