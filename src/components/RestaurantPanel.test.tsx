import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RestaurantPanel } from './RestaurantPanel';
import { useStore } from '../store';
import type { Restaurant } from '../types';

const make = (id: string, name: string): Restaurant => ({
  id, name, region: { sido: '서울특별시', sigungu: '중구', emd: '명동' }, address: '주소',
  coord: { lat: 37.5, lng: 127 }, menus: [], signatureMenu: null, category: '한식',
  episode: { season: 1, no: null, airDate: null }, links: { naver: 'n', kakao: 'k' },
  confidence: 'high', sources: [],
});

describe('RestaurantPanel', () => {
  beforeEach(() => {
    useStore.setState({
      restaurants: [make('a', '가게A'), make('b', '가게B')], selectedSido: '서울특별시',
      selectedId: null, hoveredId: null, filter: { category: 'ALL', season: 'ALL', query: '' },
    });
  });

  it('lists visible restaurants of the selected sido', () => {
    render(<RestaurantPanel />);
    expect(screen.getByText('가게A')).toBeInTheDocument();
    expect(screen.getByText('가게B')).toBeInTheDocument();
  });

  it('shows a prompt when no sido selected', () => {
    useStore.setState({ selectedSido: null });
    render(<RestaurantPanel />);
    expect(screen.getByText(/지도에서 지역/)).toBeInTheDocument();
  });
});
