import { describe, it, expect } from 'vitest';
import { jitter, resolveCentroid, sigunguMatch, type CentroidRow, type SigunguRow } from './centroid';

const emdIndex: CentroidRow[] = [
  { sido: '서울특별시', sigungu: '중구', emd: '명동', lng: 126.985, lat: 37.563 },
];
const sigunguIndex: SigunguRow[] = [
  { sido: '서울특별시', sigungu: '중구', lng: 126.99, lat: 37.56 },
  { sido: '경기도', sigungu: '수원시팔달구', lng: 127.03, lat: 37.27 },
];

describe('jitter', () => {
  it('is deterministic for the same key', () => {
    const base = { lat: 37.5, lng: 127 };
    expect(jitter(base, 'a')).toEqual(jitter(base, 'a'));
  });
  it('produces different, small offsets for different keys', () => {
    const base = { lat: 37.5, lng: 127 };
    const a = jitter(base, 'a');
    const b = jitter(base, 'b');
    expect(a).not.toEqual(b);
    expect(Math.abs(a.lat - base.lat)).toBeLessThan(0.01);
  });
});

describe('sigunguMatch', () => {
  it('ignores whitespace differences', () => {
    expect(sigunguMatch('수원시팔달구', '수원시 팔달구')).toBe(true);
  });
  it('allows suffix match for bare 일반구', () => {
    expect(sigunguMatch('수원시팔달구', '팔달구')).toBe(true);
  });
  it('rejects unrelated names', () => {
    expect(sigunguMatch('종로구', '중구')).toBe(false);
  });
});

describe('resolveCentroid', () => {
  it('matches emd level when sido+sigungu+emd all match', () => {
    const hit = resolveCentroid(emdIndex, sigunguIndex, { sido: '서울특별시', sigungu: '중구', emd: '명동' });
    expect(hit).toEqual({ coord: { lat: 37.563, lng: 126.985 }, level: 'emd' });
  });
  it('falls back to sigungu centroid when emd name does not exist', () => {
    const hit = resolveCentroid(emdIndex, sigunguIndex, { sido: '서울특별시', sigungu: '중구', emd: '없는동' });
    expect(hit).toEqual({ coord: { lat: 37.56, lng: 126.99 }, level: 'sigungu' });
  });
  it('tolerates 시+구 whitespace on sigungu fallback', () => {
    const hit = resolveCentroid(emdIndex, sigunguIndex, { sido: '경기도', sigungu: '수원시 팔달구', emd: '우만동' });
    expect(hit).toEqual({ coord: { lat: 37.27, lng: 127.03 }, level: 'sigungu' });
  });
  it('returns null when nothing matches', () => {
    expect(resolveCentroid(emdIndex, sigunguIndex, { sido: '제주특별자치도', sigungu: '제주시', emd: '없는동' })).toBeNull();
  });
});
