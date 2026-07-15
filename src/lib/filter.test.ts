import { describe, it, expect } from 'vitest';
import { matchesCategory, matchesQuery, EMPTY_FILTER, ALL } from './filter';
import type { Restaurant } from '../types';

const make = (over: Partial<Restaurant>): Restaurant => ({
  id: 'x', name: '식당', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' },
  address: '', coord: null, menus: [], signatureMenu: null, category: '한식',
  image: null, images: [], episode: { season: null, no: null, airDate: null },
  links: { naver: '', kakao: '' }, confidence: 'high', sources: [], ...over,
});

describe('filter predicates', () => {
  it('EMPTY_FILTER has ALL category and empty query', () => {
    expect(EMPTY_FILTER).toEqual({ category: ALL, query: '' });
  });

  it('matchesCategory passes everything for ALL, else matches exact', () => {
    const r = make({ category: '해산물' });
    expect(matchesCategory(r, ALL)).toBe(true);
    expect(matchesCategory(r, '해산물')).toBe(true);
    expect(matchesCategory(r, '고기')).toBe(false);
  });

  it('matchesQuery searches name and menus, space/case insensitive; empty query passes', () => {
    const r = make({ name: '국수집', menus: ['잔치국수', '비빔국수'] });
    expect(matchesQuery(r, '')).toBe(true);
    expect(matchesQuery(r, '국수')).toBe(true);
    expect(matchesQuery(r, '잔 치')).toBe(true); // 공백 무시
    expect(matchesQuery(r, '없는메뉴')).toBe(false);
  });
});
