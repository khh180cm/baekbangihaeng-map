import { describe, it, expect } from 'vitest';
import { buildMapLinks } from './mapLinks';

describe('buildMapLinks', () => {
  it('builds keyless naver and kakao search URLs with encoded query', () => {
    const { naver, kakao } = buildMapLinks('하동관', '중구');
    const q = encodeURIComponent('하동관 중구');
    expect(naver).toBe(`https://map.naver.com/v5/search/${q}`);
    expect(kakao).toBe(`https://map.kakao.com/link/search/${q}`);
  });
  it('trims and handles empty sigungu', () => {
    const { naver } = buildMapLinks('식당', '');
    expect(naver).toBe(`https://map.naver.com/v5/search/${encodeURIComponent('식당')}`);
  });
});
