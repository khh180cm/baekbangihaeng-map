import { useStore, visibleRestaurants } from '../store';
import { RestaurantCard } from './RestaurantCard';

export function RestaurantPanel() {
  const sido = useStore((s) => s.selectedSido);
  const list = useStore(visibleRestaurants);
  const hoverRestaurant = useStore((s) => s.hoverRestaurant);
  const selectRestaurant = useStore((s) => s.selectRestaurant);
  const hoveredId = useStore((s) => s.hoveredId);
  const selectedId = useStore((s) => s.selectedId);

  if (!sido) return <p className="empty">지도에서 지역을 선택하세요.</p>;
  if (list.length === 0) return <p className="empty">조건에 맞는 식당이 없습니다.</p>;

  return (
    <div className="panel">
      <p className="panel-count">{sido} · {list.length}곳</p>
      {list.map((r) => (
        <div
          key={r.id}
          className={`row${r.id === hoveredId || r.id === selectedId ? ' hovered' : ''}`}
          onMouseEnter={() => hoverRestaurant(r.id)}
          onMouseLeave={() => hoverRestaurant(null)}
          onClick={() => selectRestaurant(r.id)}
        >
          <RestaurantCard restaurant={r} />
        </div>
      ))}
    </div>
  );
}
