import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RestaurantCard } from './RestaurantCard';
import type { Restaurant } from '../types';

const r: Restaurant = {
  id: 'a', name: '하동관', region: { sido: '서울특별시', sigungu: '중구', emd: '명동' },
  address: '서울특별시 중구 명동 10-4', coord: { lat: 37.5, lng: 127 },
  menus: ['곰탕', '수육'], signatureMenu: '곰탕', category: '한식', image: null,
  episode: { season: 3, no: 42, airDate: '2021-01-01' },
  links: {
    naver: 'https://map.naver.com/v5/search/하동관',
    kakao: 'https://map.kakao.com/link/search/하동관',
    diningcode: 'https://www.diningcode.com/profile.php?rid=abc',
  },
  confidence: 'high', sources: [],
};

describe('RestaurantCard', () => {
  it('shows name, address, menus, episode and outbound links', () => {
    render(<RestaurantCard restaurant={r} />);
    expect(screen.getByText('하동관')).toBeInTheDocument();
    expect(screen.getByText(/명동 10-4/)).toBeInTheDocument();
    expect(screen.getByText(/대표메뉴: 곰탕/)).toBeInTheDocument();
    expect(screen.getByText(/메뉴: 곰탕, 수육/)).toBeInTheDocument();
    expect(screen.getByText(/3기/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /네이버/ })).toHaveAttribute('href', r.links.naver);
    expect(screen.getByRole('link', { name: /카카오/ })).toHaveAttribute('href', r.links.kakao);
    expect(screen.getByRole('link', { name: /사진·후기/ })).toHaveAttribute('href', r.links.diningcode);
  });

  it('renders the real image when present, falling back to icon otherwise', () => {
    render(<RestaurantCard restaurant={{ ...r, image: 'https://example.com/food.webp' }} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/food.webp');
  });

  it('shows "출연" instead of a fake 기수 when season is unknown', () => {
    render(<RestaurantCard restaurant={{ ...r, episode: { season: null, no: null, airDate: null } }} />);
    expect(screen.getByText(/백반기행 출연/)).toBeInTheDocument();
  });
});
