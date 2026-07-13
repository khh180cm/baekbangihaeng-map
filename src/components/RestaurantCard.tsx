import type { Restaurant } from '../types';
import { categoryIcon } from '../lib/categories';

export function RestaurantCard({ restaurant: r }: { restaurant: Restaurant }) {
  return (
    <article className="card">
      <div className="card-thumb" aria-hidden>{categoryIcon(r.category)}</div>
      <div className="card-body">
        <h3 className="card-name">{r.name} <span className="cat">{r.category}</span></h3>
        {r.signatureMenu && <p className="sig">🍽️ 대표메뉴: {r.signatureMenu}</p>}
        {r.menus.length > 0 && <p className="menus">메뉴: {r.menus.join(', ')}</p>}
        <p className="addr">📍 {r.address}</p>
        <p className="epi">
          백반기행 {r.episode.season}기
          {r.episode.no ? ` · ${r.episode.no}회` : ''}
          {r.episode.airDate ? ` · ${r.episode.airDate}` : ''}
        </p>
        {r.coord === null && <p className="warn">위치 미확인</p>}
        <div className="links">
          <a href={r.links.naver} target="_blank" rel="noreferrer">네이버 지도</a>
          <a href={r.links.kakao} target="_blank" rel="noreferrer">카카오맵</a>
          <a href={r.links.naver} target="_blank" rel="noreferrer">📷 사진 보기</a>
        </div>
      </div>
    </article>
  );
}
