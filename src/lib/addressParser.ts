import { canonicalSido, type Sido } from './sido';

export interface ParsedAddress {
  sido: Sido;
  sigungu: string;
  emd: string;
}

const SIGUNGU_SUFFIX = /(시|군|구)$/;
const EMD_SUFFIX = /(읍|면|동|가)$/;

/**
 * 한국 주소 텍스트를 {sido, sigungu, emd}로 파싱한다.
 * - sido: 약칭/구명칭도 canonicalSido로 정규화
 * - sigungu: 연속된 시/군/구 토큰을 흡수 (예: "수원시 팔달구")
 * - emd: 읍/면/동/가로 끝나는 첫 토큰
 */
export function parseAddress(addr: string): ParsedAddress | null {
  const tokens = addr.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;

  const sido = canonicalSido(tokens[0]);
  if (!sido) return null;

  let i = 1;
  const sigunguParts: string[] = [];
  while (i < tokens.length && SIGUNGU_SUFFIX.test(tokens[i])) {
    sigunguParts.push(tokens[i]);
    i++;
  }
  if (sigunguParts.length === 0) return null;

  let emd = '';
  for (let j = i; j < tokens.length; j++) {
    if (EMD_SUFFIX.test(tokens[j])) {
      emd = tokens[j];
      break;
    }
  }
  if (!emd) return null;

  return { sido, sigungu: sigunguParts.join(' '), emd };
}
