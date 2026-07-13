import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, visibleRestaurants } from '../store';
import { useGeo } from '../geo/useGeo';
import { createProjection, pathFor, projectCoord } from '../geo/projection';
import { usePanZoom } from '../geo/usePanZoom';
import { clusterPoints, type Pt } from '../geo/cluster';
import { asset } from '../lib/asset';
import { nav } from '../navigation';

const W = 640;
const H = 640;
const CLUSTER_PX = 30; // 이 화면거리 이내 점은 한 클러스터로

interface SidoIndexRow { sidoCode: string; sido: string }

function useSidoCode(sido: string | null): string | null {
  const { data } = useGeo<SidoIndexRow[]>(asset('geo/sido-index.json'));
  if (!sido || !data) return null;
  return data.find((d) => d.sido === sido)?.sidoCode ?? null;
}

export function MapProvince() {
  const sido = useStore((s) => s.selectedSido);
  const sidoCode = useSidoCode(sido);
  const { data: emd } = useGeo(sidoCode ? asset(`geo/emd/${sidoCode}.json`) : '');
  const { data: sidoData } = useGeo(asset('geo/sido.json')); // 주변 지역 맥락(서울 '구멍' 방지)
  const restaurants = useStore(visibleRestaurants);
  const hoverRestaurant = useStore((s) => s.hoverRestaurant);
  const hoveredId = useStore((s) => s.hoveredId);
  const selectedId = useStore((s) => s.selectedId);
  const pz = usePanZoom(W, H);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgW, setSvgW] = useState(360);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setSvgW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [emd]);

  const { path, projection, features } = useMemo(() => {
    if (!emd) return { path: null as any, projection: null as any, features: [] as any[] };
    const p = createProjection(emd, W, H);
    return { path: pathFor(p), projection: p, features: (emd as any).features as any[] };
  }, [emd]);

  const { k, x: tx, y: ty } = pz.transform;

  // 화면 좌표로 투영한 뒤 클러스터링
  const clusters = useMemo(() => {
    if (!projection) return [];
    const pts: Pt[] = [];
    for (const r of restaurants) {
      if (!r.coord) continue;
      const p = projectCoord(projection, r.coord);
      if (!p) continue;
      pts.push({ id: r.id, x: p[0] * k + tx, y: p[1] * k + ty });
    }
    return clusterPoints(pts, (CLUSTER_PX * W) / svgW);
  }, [restaurants, projection, k, tx, ty, svgW]);

  // 선택된 식당으로 지도 이동
  useEffect(() => {
    if (!selectedId || !projection) return;
    const r = restaurants.find((x) => x.id === selectedId);
    if (!r?.coord) return;
    const p = projectCoord(projection, r.coord);
    if (p) pz.centerOn(p[0], p[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, projection]);

  const zoomToCluster = (cx: number, cy: number) => {
    pz.centerOn((cx - tx) / k, (cy - ty) / k, Math.min(9, Math.max(3, k * 2.2)));
  };

  const nameById = useMemo(() => {
    const m = new Map<string, { name: string; sig: string }>();
    for (const r of restaurants) m.set(r.id, { name: r.name, sig: r.signatureMenu ?? r.category });
    return m;
  }, [restaurants]);

  return (
    <div className="province">
      <div className="province-head">
        <button data-testid="back" className="back-btn" onClick={() => nav.back()} aria-label="전국으로">
          ◀ 전국
        </button>
        <h2 className="province-title">{sido}</h2>
      </div>
      <div className="map-wrap">
        {!emd ? (
          <div className="loading">지도를 불러오는 중…</div>
        ) : (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`${sido} 지도`}
              className="map-svg"
              style={{ touchAction: 'none' }}
              {...pz.bind}
            >
              <g transform={pz.transformStr}>
                {/* 주변 시/도 맥락(서울 등 인접 지역이 빈 구멍으로 보이지 않게 옅게 표시) */}
                {sidoData && (sidoData as any).features.map((f: any, i: number) => (
                  <path key={`ctx${i}`} d={path(f) ?? undefined} fill="#eae2d6" stroke="#dccdb6" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
                ))}
                {/* 선택 시/도의 읍면동 */}
                {features.map((f: any, i: number) => (
                  <path key={i} d={path(f) ?? undefined} fill="#f7efe1" stroke="#c8a878" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
                ))}
              </g>
              {clusters.map((c, i) => {
                if (c.x < -30 || c.x > W + 30 || c.y < -30 || c.y > H + 30) return null;
                if (c.items.length === 1) {
                  const id = c.items[0].id;
                  const active = id === hoveredId || id === selectedId;
                  const info = nameById.get(id);
                  return (
                    <g key={id} style={{ cursor: 'pointer' }}
                       onMouseEnter={() => hoverRestaurant(id)}
                       onMouseLeave={() => hoverRestaurant(null)}
                       onClick={() => nav.openRestaurant(id)}>
                      <circle data-testid={`dot-${id}`} cx={c.x} cy={c.y} r={46} fill="#e53935" fillOpacity={0} pointerEvents="all" />
                      <circle cx={c.x} cy={c.y} r={active ? 11 : 7} fill={active ? '#c62828' : '#e53935'} stroke="#fff" strokeWidth={active ? 3 : 2} pointerEvents="none">
                        <title>{info?.name} · {info?.sig}</title>
                      </circle>
                    </g>
                  );
                }
                const n = c.items.length;
                const r = 15 + Math.min(13, Math.round(Math.log2(n) * 4));
                return (
                  <g key={`c${i}`} style={{ cursor: 'pointer' }} onClick={() => zoomToCluster(c.x, c.y)}>
                    <circle cx={c.x} cy={c.y} r={r + 4} fill="#e53935" fillOpacity={0} pointerEvents="all" />
                    <circle cx={c.x} cy={c.y} r={r} fill="#e53935" fillOpacity={0.9} stroke="#fff" strokeWidth={2.5} pointerEvents="none" />
                    <text x={c.x} y={c.y} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={800} fill="#fff" pointerEvents="none">{n}</text>
                  </g>
                );
              })}
            </svg>
            <div className="zoom-controls">
              <button onClick={pz.zoomIn} aria-label="확대">＋</button>
              <button onClick={pz.zoomOut} aria-label="축소">－</button>
              <button onClick={pz.reset} aria-label="원래대로" disabled={!pz.isZoomed}>⟲</button>
            </div>
            <p className="map-hint">숫자를 누르면 확대 · 점을 누르면 식당 보기</p>
          </>
        )}
      </div>
    </div>
  );
}
