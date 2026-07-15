import { create } from 'zustand';
import type { Restaurant } from './types';
import type { Sido } from './lib/sido';
import { type FilterState, EMPTY_FILTER, matchesCategory, matchesQuery } from './lib/filter';

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
  /** 히스토리(뒤로가기) 복원용: 뷰 상태를 한 번에 설정 */
  setView: (sido: Sido | null, id: string | null, query?: string) => void;
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
  setView: (sido, id, query) =>
    set((s) => ({
      selectedSido: sido,
      selectedId: id,
      hoveredId: null,
      filter: query === undefined ? s.filter : { ...s.filter, query },
    })),
}));

/** 전국 지도 뱃지: 선택된 카테고리 기준으로 시/도별 개수를 센다(검색어 무관). */
export function countBySido(s: State): Record<string, number> {
  const cat = s.filter.category;
  const out: Record<string, number> = {};
  for (const r of s.restaurants) {
    if (!matchesCategory(r, cat)) continue;
    out[r.region.sido] = (out[r.region.sido] ?? 0) + 1;
  }
  return out;
}

/** 선택 시/도의 식당(카테고리 facet 적용). 지도 점 + 지역 리스트에 사용. 검색어는 미적용. */
export function visibleRestaurants(s: State): Restaurant[] {
  if (!s.selectedSido) return [];
  return s.restaurants.filter((r) => r.region.sido === s.selectedSido && matchesCategory(r, s.filter.category));
}

/** 독립 전역 검색: 검색어가 있으면 전국에서 텍스트로 찾는다(카테고리·지역 무관). 없으면 null. */
export function searchResults(s: State): Restaurant[] | null {
  const q = s.filter.query.trim();
  if (!q) return null;
  return s.restaurants.filter((r) => matchesQuery(r, q));
}
