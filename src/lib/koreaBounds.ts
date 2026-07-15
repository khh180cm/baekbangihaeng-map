/** 남한 좌표 경계 상자(대략). 좌표 유효성 검증에 공통 사용. */
export const KOREA_BBOX = { minLat: 33, maxLat: 39.5, minLng: 124, maxLng: 132 } as const;

export function inKoreaBbox(lat: number, lng: number): boolean {
  return (
    lat >= KOREA_BBOX.minLat && lat <= KOREA_BBOX.maxLat &&
    lng >= KOREA_BBOX.minLng && lng <= KOREA_BBOX.maxLng
  );
}
