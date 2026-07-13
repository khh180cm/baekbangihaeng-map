import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { useStore } from './store';
import type { Restaurant } from './types';

const sidoFC = {
  type: 'FeatureCollection', features: [
    {
      type: 'Feature', properties: { sidoCode: '11', sido: '서울특별시' },
      geometry: { type: 'Polygon', coordinates: [[[126.9, 37.4], [127.2, 37.4], [127.2, 37.7], [126.9, 37.7], [126.9, 37.4]]] },
    },
  ],
};
const emdFC = {
  type: 'FeatureCollection', features: [
    {
      type: 'Feature', properties: { sido: '서울특별시', sigungu: '중구', emd: '명동' },
      geometry: { type: 'Polygon', coordinates: [[[126.9, 37.4], [127.2, 37.4], [127.2, 37.7], [126.9, 37.7], [126.9, 37.4]]] },
    },
  ],
};
const r: Restaurant = {
  id: 'a', name: '하동관', region: { sido: '서울특별시', sigungu: '중구', emd: '명동' }, address: '주소',
  coord: { lat: 37.55, lng: 127.0 }, menus: ['곰탕'], signatureMenu: '곰탕', category: '한식',
  episode: { season: 3, no: null, airDate: null }, links: { naver: 'n', kakao: 'k' }, confidence: 'high', sources: [],
};

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve({
      json: () => Promise.resolve(
        url.includes('restaurants') ? [r]
          : url.includes('sido-index') ? [{ sidoCode: '11', sido: '서울특별시' }]
          : url.includes('/emd/') ? emdFC
          : sidoFC,
      ),
    })) as any);
    useStore.setState({ restaurants: [], selectedSido: null, selectedId: null, hoveredId: null });
  });

  it('drills from national to province and shows the restaurant', async () => {
    render(<App />);
    const seoul = await screen.findByTestId('sido-서울특별시');
    fireEvent.click(seoul);
    await waitFor(() => expect(screen.getAllByText('하동관').length).toBeGreaterThan(0));
  });
});
