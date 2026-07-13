import { useMemo } from 'react';
import { useStore, countBySido } from '../store';
import { useGeo } from '../geo/useGeo';
import { createProjection, pathFor } from '../geo/projection';
import { asset } from '../lib/asset';
import { nav } from '../navigation';
import type { Sido } from '../lib/sido';

const W = 500;
const H = 640;

interface Node { sido: Sido; count: number; x: number; y: number; ox: number; oy: number; r: number }

// 배지들이 겹치지 않게 서로 밀어낸다(원위치에서 최대 MAXDISP 이내로 제한).
function decollide(nodes: Node[], iters = 80, gap: number = 2.5, maxDisp = 42) {
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = a.r + b.r + gap;
        if (d < min) {
          const push = (min - d) / 2;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
  }
  for (const n of nodes) {
    const dx = n.x - n.ox, dy = n.y - n.oy;
    const d = Math.hypot(dx, dy);
    if (d > maxDisp) { n.x = n.ox + (dx / d) * maxDisp; n.y = n.oy + (dy / d) * maxDisp; }
  }
}

export function MapNational() {
  const { data } = useGeo(asset('geo/sido.json'));
  const counts = useStore(countBySido);

  const { path, projection, features } = useMemo(() => {
    if (!data) return { path: null as any, projection: null as any, features: [] as any[] };
    const proj = createProjection(data, W, H);
    return { path: pathFor(proj), projection: proj, features: (data as any).features as any[] };
  }, [data]);

  const nodes = useMemo(() => {
    if (!projection) return [] as Node[];
    const ns: Node[] = [];
    for (const f of features) {
      const sido = f.properties.sido as Sido;
      const count = counts[sido] ?? 0;
      if (count === 0) continue;
      const lp = f.properties.labelPoint as [number, number] | undefined;
      const p = lp ? projection(lp) : path.centroid(f);
      if (!p) continue;
      const r = 12 + Math.min(9, Math.round(Math.log2(count + 1) * 2));
      ns.push({ sido, count, x: p[0], y: p[1], ox: p[0], oy: p[1], r });
    }
    decollide(ns);
    return ns;
  }, [features, projection, counts, path]);

  if (!data) return <div className="loading">지도를 불러오는 중…</div>;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="남한 시도 지도" className="map-svg">
      {/* 지역 경계 */}
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
              onClick={() => nav.toProvince(sido)}
            >
              <title>{sido} ({count}곳)</title>
            </path>
          );
        })}
      </g>
      {/* 지역별 개수 배지 (겹침 회피, 탭하면 진입) */}
      <g>
        {nodes.map((n) => (
          <g key={n.sido} style={{ cursor: 'pointer' }} onClick={() => nav.toProvince(n.sido)}>
            <circle cx={n.x} cy={n.y} r={n.r} fill="#e53935" stroke="#fff" strokeWidth={2} />
            <text
              data-testid={`badge-${n.sido}`}
              x={n.x} y={n.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={n.count >= 100 ? 12 : 13}
              fontWeight={800} fill="#fff" pointerEvents="none"
            >
              {n.count}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
