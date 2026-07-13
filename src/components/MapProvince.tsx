import { useMemo } from 'react';
import { useStore, visibleRestaurants } from '../store';
import { useGeo } from '../geo/useGeo';
import { createProjection, pathFor, projectCoord } from '../geo/projection';
import { asset } from '../lib/asset';

const W = 640;
const H = 640;

interface SidoIndexRow {
  sidoCode: string;
  sido: string;
}

function useSidoCode(sido: string | null): string | null {
  const { data } = useGeo<SidoIndexRow[]>(asset('geo/sido-index.json'));
  if (!sido || !data) return null;
  return data.find((d) => d.sido === sido)?.sidoCode ?? null;
}

export function MapProvince() {
  const sido = useStore((s) => s.selectedSido);
  const sidoCode = useSidoCode(sido);
  const { data: emd } = useGeo(sidoCode ? asset(`geo/emd/${sidoCode}.json`) : '');
  const restaurants = useStore(visibleRestaurants);
  const selectRestaurant = useStore((s) => s.selectRestaurant);
  const hoverRestaurant = useStore((s) => s.hoverRestaurant);
  const backToNational = useStore((s) => s.backToNational);
  const hoveredId = useStore((s) => s.hoveredId);
  const selectedId = useStore((s) => s.selectedId);

  const { path, projection, features } = useMemo(() => {
    if (!emd) return { path: null as any, projection: null as any, features: [] as any[] };
    const p = createProjection(emd, W, H);
    return { path: pathFor(p), projection: p, features: (emd as any).features as any[] };
  }, [emd]);

  return (
    <div className="province">
      <button data-testid="back" className="back-btn" onClick={backToNational}>◀ 전국으로</button>
      <h2 className="province-title">{sido}</h2>
      {!emd ? (
        <div className="loading">지도를 불러오는 중…</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${sido} 지도`} className="map-svg">
          {features.map((f: any, i: number) => (
            <path key={i} d={path(f) ?? undefined} fill="#f7f0e8" stroke="#d0b48a" strokeWidth={0.5} />
          ))}
          {restaurants.map((r) => {
            if (!r.coord) return null;
            const xy = projectCoord(projection, r.coord);
            if (!xy) return null;
            const active = r.id === hoveredId || r.id === selectedId;
            return (
              <circle
                key={r.id}
                data-testid={`dot-${r.id}`}
                cx={xy[0]}
                cy={xy[1]}
                r={active ? 7.5 : 5}
                fill="#e53935"
                stroke="#ffffff"
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => hoverRestaurant(r.id)}
                onMouseLeave={() => hoverRestaurant(null)}
                onClick={() => selectRestaurant(r.id)}
              >
                <title>{r.name} · {r.signatureMenu ?? r.category}</title>
              </circle>
            );
          })}
        </svg>
      )}
    </div>
  );
}
