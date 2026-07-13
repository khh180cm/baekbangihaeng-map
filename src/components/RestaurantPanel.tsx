import { useEffect, useRef } from 'react';
import { useStore, visibleRestaurants } from '../store';
import { RestaurantCard } from './RestaurantCard';

export function RestaurantPanel() {
  const sido = useStore((s) => s.selectedSido);
  const list = useStore(visibleRestaurants);
  const hoverRestaurant = useStore((s) => s.hoverRestaurant);
  const selectRestaurant = useStore((s) => s.selectRestaurant);
  const hoveredId = useStore((s) => s.hoveredId);
  const selectedId = useStore((s) => s.selectedId);
  const containerRef = useRef<HTMLDivElement>(null);

  // 지도에서 점을 누르면(selectedId 변경) 해당 카드로 스크롤한다.
  useEffect(() => {
    if (!selectedId) return;
    const el = containerRef.current?.querySelector(`[data-card="${CSS.escape(selectedId)}"]`);
    (el as HTMLElement | null)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [selectedId]);

  if (!sido) return <p className="empty">지도에서 지역을 선택하세요.</p>;
  if (list.length === 0) return <p className="empty">조건에 맞는 식당이 없습니다.</p>;

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
