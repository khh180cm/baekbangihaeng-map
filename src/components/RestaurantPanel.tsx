import { useEffect, useRef } from 'react';
import { useStore, visibleRestaurants, searchResults } from '../store';
import type { Sido } from '../lib/sido';
import { RestaurantCard } from './RestaurantCard';

const SEARCH_CAP = 200;

export function RestaurantPanel() {
  const sido = useStore((s) => s.selectedSido);
  const results = useStore(searchResults);
  const list = useStore(visibleRestaurants);
  const hoverRestaurant = useStore((s) => s.hoverRestaurant);
  const selectRestaurant = useStore((s) => s.selectRestaurant);
  const selectSido = useStore((s) => s.selectSido);
  const setQuery = useStore((s) => s.setQuery);
  const hoveredId = useStore((s) => s.hoveredId);
  const selectedId = useStore((s) => s.selectedId);
  const containerRef = useRef<HTMLDivElement>(null);

  // 지도에서 점을 누르면 해당 카드로 스크롤 (검색 모드가 아닐 때)
  useEffect(() => {
    if (!selectedId || results) return;
    const el = containerRef.current?.querySelector(`[data-card="${CSS.escape(selectedId)}"]`);
    (el as HTMLElement | null)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [selectedId, results]);

  // 검색 모드: 전국 결과. 결과 클릭 시 해당 지역으로 이동하고 검색 종료.
  if (results) {
    const shown = results.slice(0, SEARCH_CAP);
    const openResult = (sidoName: string, id: string) => {
      selectSido(sidoName as Sido);
      selectRestaurant(id);
      setQuery('');
    };
    return (
      <div className="panel" ref={containerRef}>
        <p className="panel-count">
          검색 결과 · {results.length}곳{results.length > SEARCH_CAP ? ` (상위 ${SEARCH_CAP}곳 표시)` : ''}
        </p>
        {results.length === 0 && <p className="empty">검색 결과가 없습니다.</p>}
        {shown.map((r) => (
          <div
            key={r.id}
            className="row"
            onClick={() => openResult(r.region.sido, r.id)}
            title="클릭하면 지도에서 위치 보기"
          >
            <RestaurantCard restaurant={r} showRegion />
          </div>
        ))}
      </div>
    );
  }

  // 브라우즈 모드: 선택 시/도 + 카테고리
  if (!sido) return <p className="empty">지도에서 지역을 선택하거나, 위에서 검색하세요.</p>;
  if (list.length === 0) return <p className="empty">이 지역에 해당 카테고리 식당이 없습니다.</p>;

  return (
    <div className="panel" ref={containerRef}>
      <p className="panel-count">{sido} · {list.length}곳</p>
      {list.map((r) => {
        const cls =
          'row' + (r.id === selectedId ? ' selected' : '') + (r.id === hoveredId ? ' hovered' : '');
        return (
          <div
            key={r.id}
            data-card={r.id}
            className={cls}
            onMouseEnter={() => hoverRestaurant(r.id)}
            onMouseLeave={() => hoverRestaurant(null)}
            onClick={() => selectRestaurant(r.id)}
          >
            <RestaurantCard restaurant={r} />
          </div>
        );
      })}
    </div>
  );
}
