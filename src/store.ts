import { create } from 'zustand';
import type { Restaurant } from './types';
import type { Sido } from './lib/sido';
import { type FilterState, EMPTY_FILTER } from './lib/filter';

interface State {
  restaurants: Restaurant[];
  selectedSido: Sido | null;
  selectedId: string | null;
  hoveredId: string | null;
  filter: FilterState;
  setRestaurants: (r: Restaurant[]) => void;
  selectSido: (s: Sido | null) => void;
  backToNational: () => void;
  selectRestaurant: (id: string | null) => void;
  hoverRestaurant: (id: string | null) => void;
  setFilter: (f: FilterState) => void;
  setCategory: (c: FilterState['category']) => void;
  setQuery: (q: string) => void;
}

export const useStore = create<State>((set) => ({
  restaurants: [],
  selectedSido: null,
  selectedId: null,
  hoveredId: null,
  filter: EMPTY_FILTER,
  setRestaurants: (restaurants) => set({ restaurants }),
  selectSido: (selectedSido) => set({ selectedSido, selectedId: null }),
  backToNational: () => set({ selectedSido: null, selectedId: null, hoveredId: null }),
  selectRestaurant: (selectedId) => set({ selectedId }),
  hoverRestaurant: (hoveredId) => set({ hoveredId }),
  setFilter: (filter) => set({ filter }),
  setCategory: (category) => set((s) => ({ filter: { ...s.filter, category } })),
  setQuery: (query) => set((s) => ({ filter: { ...s.filter, query } })),
}));

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
const textMatch = (r: Restaurant, q: string) =>
  norm(r.name + ' ' + r.menus.join(' ')).includes(norm(q));
const inCategory = (r: Restaurant, cat: FilterState['category']) =>
  cat === 'ALL' || r.category === cat;

/** 전국 지도 뱃지: 선택된 카테고리 기준으로 시/도별 개수를 센다(검색어 무관). */
export function countBySido(s: State): Record<string, number> {
  const cat = s.filter.category;
  const out: Record<string, number> = {};
  for (const r of s.restaurants) {
    if (!inCategory(r, cat)) continue;
    out[r.region.sido] = (out[r.region.sido] ?? 0) + 1;
  }
  return out;
}

/** 선택 시/도의 식당(카테고리 facet 적용). 지도 점 + 지역 리스트에 사용. 검색어는 미적용. */
export function visibleRestaurants(s: State): Restaurant[] {
  if (!s.selectedSido) return [];
  const cat = s.filter.category;
  return s.restaurants.filter((r) => r.region.sido === s.selectedSido && inCategory(r, cat));
}

/** 독립 전역 검색: 검색어가 있으면 전국에서 텍스트로 찾는다(카테고리·지역 무관). 없으면 null. */
export function searchResults(s: State): Restaurant[] | null {
  const q = s.filter.query.trim();
  if (!q) return null;
  return s.restaurants.filter((r) => textMatch(r, q));
}
