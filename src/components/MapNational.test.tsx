import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MapNational } from './MapNational';
import { useStore } from '../store';
import type { Restaurant } from '../types';

const sidoFC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature', properties: { sidoCode: '11', sido: '서울특별시' },
      geometry: { type: 'Polygon', coordinates: [[[126.9, 37.4], [127.2, 37.4], [127.2, 37.7], [126.9, 37.7], [126.9, 37.4]]] },
    },
    {
      type: 'Feature', properties: { sidoCode: '21', sido: '부산광역시' },
      geometry: { type: 'Polygon', coordinates: [[[128.9, 35.0], [129.2, 35.0], [129.2, 35.3], [128.9, 35.3], [128.9, 35.0]]] },
    },
  ],
};

const make = (id: string, sido: string): Restaurant => ({
  id, name: '식당', region: { sido, sigungu: '중구', emd: '명동' }, address: '',
  coord: { lat: 37.5, lng: 127 }, menus: [], signatureMenu: null, category: '한식',
  episode: { season: 1, no: null, airDate: null }, links: { naver: '', kakao: '' },
  confidence: 'high', sources: [],
});

describe('MapNational', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(sidoFC) })) as any);
    useStore.setState({
      restaurants: [make('a', '서울특별시'), make('b', '서울특별시'), make('c', '부산광역시')],
      selectedSido: null,
    });
  });

  it('renders a clickable region per sido with a count badge', async () => {
    render(<MapNational />);
    const seoul = await screen.findByTestId('sido-서울특별시');
    expect(seoul).toBeInTheDocument();
    expect(screen.getByTestId('badge-서울특별시')).toHaveTextContent('2');
    fireEvent.click(seoul);
    await waitFor(() => expect(useStore.getState().selectedSido).toBe('서울특별시'));
  });
});
