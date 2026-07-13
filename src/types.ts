import type { Category } from './lib/categories';

export type Coord = { lat: number; lng: number };

export interface Region {
  sido: string;    // canonicalSido 결과값 (예: "서울특별시")
  sigungu: string; // 예: "종로구"
  emd: string;     // 읍/면/동 (예: "관철동")
}

export interface Episode {
  season: number;          // 기수
  no: number | null;       // 회차
  airDate: string | null;  // ISO yyyy-mm-dd
}

export interface Restaurant {
  id: string;
  name: string;
  region: Region;
  address: string;
  coord: Coord | null;     // null => 위치 미확인
  menus: string[];
  signatureMenu: string | null;
  category: Category;
  episode: Episode;
  links: { naver: string; kakao: string };
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}
