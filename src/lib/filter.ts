import type { Restaurant } from '../types';
import type { Category } from './categories';

export interface FilterState {
  category: Category | 'ALL';
  season: number | 'ALL';
  query: string;
}

export const EMPTY_FILTER: FilterState = { category: 'ALL', season: 'ALL', query: '' };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export function filterRestaurants(list: Restaurant[], f: FilterState): Restaurant[] {
  const q = norm(f.query);
  return list.filter((r) => {
    if (f.category !== 'ALL' && r.category !== f.category) return false;
    if (f.season !== 'ALL' && r.episode.season !== f.season) return false;
    if (q) {
      const hay = norm(r.name + ' ' + r.menus.join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
