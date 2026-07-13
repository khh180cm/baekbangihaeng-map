import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RestaurantCard } from './RestaurantCard';
import type { Restaurant } from '../types';

const r: Restaurant = {
  id: 'a', name: '하동관', region: { sido: '서울특별시', sigungu: '중구', emd: '명동' },
  address: '서울특별시 중구 명동 10-4', coord: { lat: 37.5, lng: 127 },
  menus: ['곰탕', '수육'], signatureMenu: '곰탕', category: '한식', image: null,
  images: ['https://example.com/1.webp', 'https://example.com/2.webp'],
  episode: { season: null, no: null, airDate: null },
  links: {
    naver: 'https://map.naver.com/v5/search/하동관',
    kakao: 'https://map.kakao.com/link/search/하동관',
    diningcode: 'https://www.diningcode.com/profile.php?rid=abc',
  },
  confidence: 'high', sources: [],
};

describe('RestaurantCard', () => {
  it('shows name, address, menus and outbound map links', () => {
    render(<RestaurantCard restaurant={r} />);
    expect(screen.getByText('하동관')).toBeInTheDocument();
    expect(screen.getByText(/명동 10-4/)).toBeInTheDocument();
    expect(screen.getByText(/대표메뉴: 곰탕/)).toBeInTheDocument();
    expect(screen.getByText(/메뉴: 곰탕, 수육/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /네이버/ })).toHaveAttribute('href', r.links.naver);
    expect(screen.getByRole('link', { name: /카카오/ })).toHaveAttribute('href', r.links.kakao);
  });

  it('renders the real thumbnail when present, falling back to icon otherwise', () => {
    render(<RestaurantCard restaurant={{ ...r, image: 'https://example.com/food.webp' }} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/food.webp');
  });

  it('toggles an inline photo gallery instead of navigating away', () => {
    render(<RestaurantCard restaurant={r} />);
    const toggle = screen.getByRole('button', { name: /사진 2장/ });
    // 처음엔 갤러리 이미지 없음
    expect(screen.queryByAltText(/사진 1/)).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByAltText(/하동관 사진 1/)).toHaveAttribute('src', 'https://example.com/1.webp');
    expect(screen.getByAltText(/하동관 사진 2/)).toBeInTheDocument();
  });

  it('hides the photo toggle when there are no images', () => {
    render(<RestaurantCard restaurant={{ ...r, images: [] }} />);
    expect(screen.queryByRole('button', { name: /사진/ })).toBeNull();
  });
});
