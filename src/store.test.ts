import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, visibleRestaurants, countBySido } from './store';
import type { Restaurant } from './types';

const make = (over: Partial<Restaurant>): Restaurant => ({
  id: 'x', name: '식당', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' },
  address: '', coord: { lat: 37.5, lng: 127 }, menus: [], signatureMenu: null, category: '한식',
  episode: { season: 1, no: null, airDate: null }, links: { naver: '', kakao: '' },
  confidence: 'high', sources: [], ...over,
});

const data = [
  make({ id: 'a', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' }, category: '한식' }),
  make({ id: 'b', region: { sido: '서울특별시', sigungu: '중구', emd: '명동' }, category: '면' }),
  make({ id: 'c', region: { sido: '부산광역시', sigungu: '중구', emd: '남포동' }, category: '한식' }),
];

describe('store', () => {
  beforeEach(() => {
    useStore.setState({ restaurants: [], selectedSido: null, selectedId: null, hoveredId: null });
    useStore.getState().setRestaurants(data);
    useStore.getState().setFilter({ category: 'ALL', season: 'ALL', query: '' });
  });

  it('countBySido counts all restaurants per sido', () => {
    expect(countBySido(useStore.getState())).toEqual({ '서울특별시': 2, '부산광역시': 1 });
  });

  it('visibleRestaurants is empty until a sido is selected', () => {
    expect(visibleRestaurants(useStore.getState())).toHaveLength(0);
  });

  it('visibleRestaurants returns filtered restaurants of the selected sido', () => {
    useStore.getState().selectSido('서울특별시');
    expect(visibleRestaurants(useStore.getState()).map((r) => r.id)).toEqual(['a', 'b']);
    useStore.getState().setFilter({ category: '면', season: 'ALL', query: '' });
    expect(visibleRestaurants(useStore.getState()).map((r) => r.id)).toEqual(['b']);
  });

  it('backToNational clears sido and selection', () => {
    useStore.getState().selectSido('서울특별시');
    useStore.getState().selectRestaurant('a');
    useStore.getState().backToNational();
    expect(useStore.getState().selectedSido).toBeNull();
    expect(useStore.getState().selectedId).toBeNull();
  });
});
