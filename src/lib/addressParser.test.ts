import { describe, it, expect } from 'vitest';
import { parseAddress } from './addressParser';

describe('parseAddress', () => {
  it('parses a metropolitan address (자치구 + 법정동)', () => {
    expect(parseAddress('서울특별시 종로구 관철동 12-3')).toEqual({
      sido: '서울특별시', sigungu: '종로구', emd: '관철동',
    });
  });
  it('parses a short sido alias', () => {
    expect(parseAddress('부산 중구 남포동 2가 15')).toEqual({
      sido: '부산광역시', sigungu: '중구', emd: '남포동',
    });
  });
  it('parses a 도 address with 시 + 동', () => {
    expect(parseAddress('강원 강릉시 초당동 291')).toEqual({
      sido: '강원특별자치도', sigungu: '강릉시', emd: '초당동',
    });
  });
  it('parses a 시 + 구 sigungu (도 산하 일반구)', () => {
    expect(parseAddress('경기 수원시 팔달구 우만동 251')).toEqual({
      sido: '경기도', sigungu: '수원시 팔달구', emd: '우만동',
    });
  });
  it('returns null on unparseable input', () => {
    expect(parseAddress('그냥 텍스트')).toBeNull();
  });
});
