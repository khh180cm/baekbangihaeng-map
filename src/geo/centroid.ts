import type { Coord } from '../types';

export interface CentroidRow {
  sido: string;
  sigungu: string;
  emd: string;
  lng: number;
  lat: number;
}

export interface SigunguRow {
  sido: string;
  sigungu: string;
  lng: number;
  lat: number;
}

// 결정적 해시 (문자열 + salt -> [0,1)). Math.random 미사용으로 재현 가능.
function hash01(s: string, salt: number): number {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** 같은 지점에 여러 식당이 겹치지 않도록 키 기반 결정적 오프셋을 더한다(~400m 반경). */
export function jitter(base: Coord, key: string): Coord {
  const r = 0.004;
  const dLat = (hash01(key, 1) - 0.5) * 2 * r;
  const dLng = (hash01(key, 2) - 0.5) * 2 * r;
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

const strip = (s: string) => s.replace(/\s+/g, '');

/**
 * 시군구 명칭 비교. 원본 지도는 공백 없이("수원시팔달구") 저장하고,
 * 주소 파서는 공백으로("수원시 팔달구") 만들므로 공백을 무시한다.
 * 또한 주소가 일반구만 담은 경우("팔달구")도 접미 일치로 허용한다.
 */
export function sigunguMatch(feature: string, parsed: string): boolean {
  const a = strip(feature);
  const b = strip(parsed);
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

/**
 * 주소 파싱 결과를 좌표로 해석한다.
 * 1) 행정동(emd) 이름까지 일치하면 emd 중심점 (level: 'emd')
 * 2) 실패 시 시군구 중심점으로 fallback (level: 'sigungu')
 * 3) 둘 다 실패하면 null
 */
export function resolveCentroid(
  emdIndex: CentroidRow[],
  sigunguIndex: SigunguRow[],
  p: { sido: string; sigungu: string; emd: string },
): { coord: Coord; level: 'emd' | 'sigungu' } | null {
  const emd = emdIndex.find(
    (r) => r.sido === p.sido && r.emd === p.emd && sigunguMatch(r.sigungu, p.sigungu),
  );
  if (emd) return { coord: { lat: emd.lat, lng: emd.lng }, level: 'emd' };

  const sg = sigunguIndex.find(
    (r) => r.sido === p.sido && sigunguMatch(r.sigungu, p.sigungu),
  );
  if (sg) return { coord: { lat: sg.lat, lng: sg.lng }, level: 'sigungu' };

  return null;
}
