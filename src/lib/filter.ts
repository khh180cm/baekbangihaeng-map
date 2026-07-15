import type { Restaurant } from '../types';
import type { Category } from './categories';

/** 카테고리 필터의 '전체' 센티넬 */
export const ALL = 'ALL';

export interface FilterState {
  category: Category | typeof ALL;
  query: string;
}

export const EMPTY_FILTER: FilterState = { category: ALL, query: '' };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/** 카테고리 매칭(ALL이면 전부 통과) */
export function matchesCategory(r: Restaurant, category: FilterState['category']): boolean {
  return category === ALL || r.category === category;
}

/** 이름·메뉴 텍스트 검색(공백·대소문자 무시). 빈 질의면 전부 통과 */
export function matchesQuery(r: Restaurant, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  return norm(`${r.name} ${r.menus.join(' ')}`).includes(q);
}
