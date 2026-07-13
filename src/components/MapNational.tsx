import { useMemo } from 'react';
import { useStore, countBySido } from '../store';
import { useGeo } from '../geo/useGeo';
import { createProjection, pathFor } from '../geo/projection';
import { asset } from '../lib/asset';
import type { Sido } from '../lib/sido';

const W = 500;
const H = 640;

export function MapNational() {
  const { data } = useGeo(asset('geo/sido.json'));
  const selectSido = useStore((s) => s.selectSido);
  const counts = useStore(countBySido);

  const { path, projection, features } = useMemo(() => {
    if (!data) return { path: null as any, projection: null as any, features: [] as any[] };
    const proj = createProjection(data, W, H);
    return { path: pathFor(proj), projection: proj, features: (data as any).features as any[] };
  }, [data]);

  if (!data) return <div className="loading">지도를 불러오는 중…</div>;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="남한 시도 지도" className="map-svg">
      {/* 1) 지역 경계 (아래) */}
      <g>
        {features.map((f: any) => {
          const sido = f.properties.sido as Sido;
          const count = counts[sido] ?? 0;
          return (
            <path
              key={sido}
              data-testid={`sido-${sido}`}
              d={path(f) ?? undefined}
              fill={count ? '#ffd8b0' : '#eeeeee'}
              stroke="#b06a2c"
              strokeWidth={0.75}
              style={{ cursor: 'pointer' }}
              onClick={() => selectSido(sido)}
            >
              <title>{sido} ({count}곳)</title>
            </path>
          );
        })}
      </g>
      {/* 2) 숫자 라벨 (모든 경계선 위) — 클릭 가능, 흰색 후광으로 가독성 확보 */}
      <g>
        {features.map((f: any) => {
          const sido = f.properties.sido as Sido;
          const count = counts[sido] ?? 0;
          if (count === 0) return null;
          // 지역 내부(경계로부터 가장 먼 지점)에 라벨을 둔다. 없으면 centroid.
          const lp = f.properties.labelPoint as [number, number] | undefined;
          const projected = lp ? projection(lp) : null;
          const [x, y] = (projected as [number, number] | null) ?? path.centroid(f);
          return (
            <g key={sido} style={{ cursor: 'pointer' }} onClick={() => selectSido(sido)}>
              {/* 숫자를 눌러도 해당 지역이 선택되도록 하는 투명 히트 영역 */}
              <circle cx={x} cy={y} r={15} fill="#ffffff" fillOpacity={0} pointerEvents="all" />
              <text
                data-testid={`badge-${sido}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={800}
                fill="#5a2e0e"
                stroke="#fff8ef"
                strokeWidth={3.5}
                pointerEvents="none"
                style={{ paintOrder: 'stroke', strokeLinejoin: 'round' }}
              >
                {count}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
