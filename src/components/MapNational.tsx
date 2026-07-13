import { useMemo } from 'react';
import { useStore, countBySido } from '../store';
import { useGeo } from '../geo/useGeo';
import { createProjection, pathFor } from '../geo/projection';
import type { Sido } from '../lib/sido';

const W = 500;
const H = 640;

export function MapNational() {
  const { data } = useGeo('/geo/sido.json');
  const selectSido = useStore((s) => s.selectSido);
  const counts = useStore(countBySido);

  const { path, features } = useMemo(() => {
    if (!data) return { path: null as any, features: [] as any[] };
    const projection = createProjection(data, W, H);
    return { path: pathFor(projection), features: (data as any).features as any[] };
  }, [data]);

  if (!data) return <div className="loading">지도를 불러오는 중…</div>;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="남한 시도 지도" className="map-svg">
      {features.map((f: any) => {
        const sido = f.properties.sido as Sido;
        const [cx, cy] = path.centroid(f);
        const count = counts[sido] ?? 0;
        return (
          <g key={sido}>
            <path
              data-testid={`sido-${sido}`}
              d={path(f) ?? undefined}
              fill={count ? '#ffd8b0' : '#eeeeee'}
              stroke="#b06a2c"
              strokeWidth={0.75}
              style={{ cursor: 'pointer' }}
              onClick={() => selectSido(sido)}
            >
              <title>{sido} ({count})</title>
            </path>
            {count > 0 && (
              <text
                data-testid={`badge-${sido}`}
                x={cx}
                y={cy}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="#7a3d12"
                pointerEvents="none"
              >
                {count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
