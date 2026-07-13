import { useState } from 'react';
import type { Restaurant } from '../types';
import { categoryIcon } from '../lib/categories';

export function RestaurantCard({ restaurant: r, showRegion = false }: { restaurant: Restaurant; showRegion?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const showImg = r.image && !imgError;

  return (
    <article className="card">
      <div className="card-thumb">
        {showImg ? (
          <img className="thumb-img" src={r.image!} alt={r.name} loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <span className="thumb-icon" aria-hidden>{categoryIcon(r.category)}</span>
        )}
      </div>
      <div className="card-body">
        <h3 className="card-name">{r.name} <span className="cat">{r.category}</span></h3>
        {showRegion && <p className="region-chip">📍 {r.region.sido} {r.region.sigungu}</p>}
        {r.signatureMenu && <p className="sig">🍽️ 대표메뉴: {r.signatureMenu}</p>}
        {r.menus.length > 0 && <p className="menus">메뉴: {r.menus.join(', ')}</p>}
        <p className="addr">📍 {r.address}</p>
        <p className="epi">
          백반기행
          {r.episode.season ? ` ${r.episode.season}기` : ' 출연'}
          {r.episode.no ? ` · ${r.episode.no}회` : ''}
          {r.episode.airDate ? ` · ${r.episode.airDate}` : ''}
        </p>
        {r.coord === null && <p className="warn">위치 미확인</p>}
        <div className="links">
          <a href={r.links.naver} target="_blank" rel="noreferrer">네이버 지도</a>
          <a href={r.links.kakao} target="_blank" rel="noreferrer">카카오맵</a>
          {r.links.diningcode && (
            <a href={r.links.diningcode} target="_blank" rel="noreferrer">📷 사진·후기</a>
          )}
        </div>
      </div>
    </article>
  );
}
