/**
 * 네이버/카카오 지도 "검색" URL을 생성한다. API 키가 필요 없으며,
 * 클릭 시 해당 서비스의 실제 장소/사진 페이지로 이동한다.
 */
export function buildMapLinks(
  name: string,
  sigungu: string,
): { naver: string; kakao: string } {
  const q = encodeURIComponent(`${name} ${sigungu}`.trim());
  return {
    naver: `https://map.naver.com/v5/search/${q}`,
    kakao: `https://map.kakao.com/link/search/${q}`,
  };
}
