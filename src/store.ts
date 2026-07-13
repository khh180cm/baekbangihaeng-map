import { create } from 'zustand';
import type { Restaurant } from './types';
import type { Sido } from './lib/sido';
import { type FilterState, EMPTY_FILTER, filterRestaurants } from './lib/filter';

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
}));

export function countBySido(s: State): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of s.restaurants) out[r.region.sido] = (out[r.region.sido] ?? 0) + 1;
  return out;
}

export function visibleRestaurants(s: State): Restaurant[] {
  if (!s.selectedSido) return [];
  const inSido = s.restaurants.filter((r) => r.region.sido === s.selectedSido);
  return filterRestaurants(inSido, s.filter);
}
