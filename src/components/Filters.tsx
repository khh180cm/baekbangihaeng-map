import { useStore } from '../store';
import { CATEGORIES, type Category } from '../lib/categories';

export function Filters() {
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);

  return (
    <div className="filters">
      <input
        data-testid="filter-query"
        className="filter-input"
        placeholder="식당·메뉴 검색"
        value={filter.query}
        onChange={(e) => setFilter({ ...filter, query: e.target.value })}
      />
      <select
        data-testid="filter-category"
        value={filter.category}
        onChange={(e) => setFilter({ ...filter, category: e.target.value as Category | 'ALL' })}
      >
        <option value="ALL">전체 카테고리</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
