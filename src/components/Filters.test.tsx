import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Filters } from './Filters';
import { useStore } from '../store';
import type { Restaurant } from '../types';

const make = (id: string, season: number): Restaurant => ({
  id, name: 'n', region: { sido: '서울특별시', sigungu: '중구', emd: '명동' }, address: '',
  coord: null, menus: [], signatureMenu: null, category: '한식',
  episode: { season, no: null, airDate: null }, links: { naver: '', kakao: '' }, confidence: 'high', sources: [],
});

describe('Filters', () => {
  beforeEach(() => {
    useStore.setState({ restaurants: [make('a', 1), make('b', 3)], filter: { category: 'ALL', season: 'ALL', query: '' } });
  });

  it('updates query filter on input', () => {
    render(<Filters />);
    fireEvent.change(screen.getByTestId('filter-query'), { target: { value: '국밥' } });
    expect(useStore.getState().filter.query).toBe('국밥');
  });

  it('updates category filter on select', () => {
    render(<Filters />);
    fireEvent.change(screen.getByTestId('filter-category'), { target: { value: '해산물' } });
    expect(useStore.getState().filter.category).toBe('해산물');
  });

  it('lists available seasons from data', () => {
    render(<Filters />);
    const opts = Array.from(screen.getByTestId('filter-season').querySelectorAll('option')).map((o) => o.textContent);
    expect(opts).toContain('1기');
    expect(opts).toContain('3기');
  });
});
