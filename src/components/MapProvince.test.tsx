import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MapProvince } from './MapProvince';
import { useStore } from '../store';
import type { Restaurant } from '../types';

const emdFC = {
  type: 'FeatureCollection', features: [
    {
      type: 'Feature', properties: { sido: '서울특별시', sigungu: '중구', emd: '명동' },
      // CCW 와인딩(d3-geo 구면 기하에서 작은 내부 영역으로 해석되도록)
      geometry: { type: 'Polygon', coordinates: [[[126.9, 37.4], [126.9, 37.7], [127.2, 37.7], [127.2, 37.4], [126.9, 37.4]]] },
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
      // 서로 멀리 떨어진 좌표(클러스터로 묶이지 않게) → 개별 점 렌더 검증
      restaurants: [make('a', { lat: 37.68, lng: 126.95 }), make('b', { lat: 37.42, lng: 127.15 }), make('c', null)],
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

  it('invokes browser back on the back button (history-driven navigation)', async () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    render(<MapProvince />);
    fireEvent.click(await screen.findByTestId('back'));
    expect(backSpy).toHaveBeenCalled();
    backSpy.mockRestore();
  });
});
