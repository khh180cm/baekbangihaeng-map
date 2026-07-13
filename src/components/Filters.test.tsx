import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Filters } from './Filters';
import { useStore } from '../store';

describe('Filters', () => {
  beforeEach(() => {
    useStore.setState({ restaurants: [], filter: { category: 'ALL', season: 'ALL', query: '' } });
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

  it('does not render a 기수(season) filter (DiningCode has no episode data)', () => {
    render(<Filters />);
    expect(screen.queryByTestId('filter-season')).toBeNull();
  });
});
