import { useState } from 'react';
import type { Restaurant } from '../types';
import { categoryIcon } from '../lib/categories';

export function RestaurantCard({ restaurant: r, showRegion = false }: { restaurant: Restaurant; showRegion?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const showImg = r.image && !imgError;
  const photos = r.images?.filter((_, i) => !broken[i]) ?? [];
  const hasPhotos = (r.images?.length ?? 0) > 0;

  return (
    <article className="card">
      <div className="card-row">
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
          {r.coord === null && <p className="warn">위치 미확인</p>}
        </div>
      </div>

      {open && hasPhotos && (
        <div className="photo-strip" onClick={(e) => e.stopPropagation()}>
          {r.images.map((src, i) => (broken[i] ? null : (
            <img key={i} className="photo" src={src} alt={`${r.name} 사진 ${i + 1}`} loading="lazy"
              onError={() => setBroken((b) => ({ ...b, [i]: true }))} />
          )))}
          {photos.length === 0 && <span className="photo-none">사진을 불러오지 못했어요</span>}
        </div>
      )}

      <div className="links">
        {hasPhotos && (
          <button
            className={`photo-toggle${open ? ' open' : ''}`}
            aria-expanded={open}
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          >
            📷 사진 {r.images.length}장 {open ? '접기 ▲' : '보기 ▼'}
          </button>
        )}
        <a href={r.links.naver} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>네이버 지도</a>
        <a href={r.links.kakao} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>카카오맵</a>
        {r.links.diningcode && (
          <a href={r.links.diningcode} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>후기</a>
        )}
      </div>
    </article>
  );
}
