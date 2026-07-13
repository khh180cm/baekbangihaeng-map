import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MapProvince } from './MapProvince';
import { useStore } from '../store';
import type { Restaurant } from '../types';

const emdFC = {
  type: 'FeatureCollection', features: [
    {
      type: 'Feature', properties: { sido: '서울특별시', sigungu: '중구', emd: '명동' },
      geometry: { type: 'Polygon', coordinates: [[[126.9, 37.4], [127.2, 37.4], [127.2, 37.7], [126.9, 37.7], [126.9, 37.4]]] },
    },
  ],
};

const make = (id: string, coord: Restaurant['coord']): Restaurant => ({
  id, name: '식당' + id, region: { sido: '서울특별시', sigungu: '중구', emd: '명동' }, address: '',
  coord, menus: [], signatureMenu: null, category: '한식', episode: { season: 1, no: null, airDate: null },
  links: { naver: '', kakao: '' }, confidence: 'high', sources: [],
});

describe('MapProvince', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) =>
      Promise.resolve({
        json: () => Promise.resolve(
          url.includes('sido-index') ? [{ sidoCode: '11', sido: '서울특별시' }] : emdFC,
        ),
      })) as any);
    useStore.setState({
      restaurants: [make('a', { lat: 37.55, lng: 127.0 }), make('b', { lat: 37.5, lng: 127.05 }), make('c', null)],
      selectedSido: '서울특별시', selectedId: null, hoveredId: null,
      filter: { category: 'ALL', season: 'ALL', query: '' },
    });
  });

  it('renders one red dot per restaurant that has coords', async () => {
    render(<MapProvince />);
    await screen.findByTestId('dot-a');
    expect(screen.getByTestId('dot-b')).toBeInTheDocument();
    expect(screen.queryByTestId('dot-c')).toBeNull();
  });

  it('selects a restaurant on dot click', async () => {
    render(<MapProvince />);
    fireEvent.click(await screen.findByTestId('dot-a'));
    await waitFor(() => expect(useStore.getState().selectedId).toBe('a'));
  });

  it('goes back to national on back button', async () => {
    render(<MapProvince />);
    fireEvent.click(await screen.findByTestId('back'));
    await waitFor(() => expect(useStore.getState().selectedSido).toBeNull());
  });
});
