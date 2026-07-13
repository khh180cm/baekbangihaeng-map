import { useCallback, useEffect, useRef, useState } from 'react';

export interface Transform { k: number; x: number; y: number; }

interface PanZoom {
  transform: Transform;
  transformStr: string;
  bind: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
  };
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  isZoomed: boolean;
  centerOn: (vx: number, vy: number, k?: number) => void;
}

/**
 * SVG 콘텐츠(viewBox W×H)에 대한 팬/줌. 손가락 핀치·드래그, 마우스 휠/드래그,
 * +/- 버튼을 모두 지원한다. 좌표는 viewBox 단위로 다룬다.
 */
export function usePanZoom(W: number, H: number, minK = 1, maxK = 9): PanZoom {
  const [t, setT] = useState<Transform>({ k: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number; type: string }>());
  const pinch = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const kRef = useRef(1);
  useEffect(() => { kRef.current = t.k; }, [t.k]);

  const clamp = useCallback((n: Transform): Transform => {
    const k = Math.max(minK, Math.min(maxK, n.k));
    const minX = W * (1 - k), minY = H * (1 - k);
    return { k, x: Math.max(minX, Math.min(0, n.x)), y: Math.max(minY, Math.min(0, n.y)) };
  }, [W, H, minK, maxK]);

  // client 좌표 → viewBox 좌표
  const toView = (clientX: number, clientY: number, el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  };

  const zoomAround = useCallback((vx: number, vy: number, factor: number) => {
    setT((prev) => {
      const k2 = Math.max(minK, Math.min(maxK, prev.k * factor));
      const f = k2 / prev.k;
      return clamp({ k: k2, x: vx - (vx - prev.x) * f, y: vy - (vy - prev.y) * f });
    });
  }, [clamp, minK, maxK]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    svgRef.current = e.currentTarget as unknown as SVGSVGElement;
    // 포인터 캡처는 하지 않는다(점 onClick과 충돌 방지). 이동이 있을 때만 팬.
    const v = toView(e.clientX, e.clientY, e.currentTarget as Element);
    pointers.current.set(e.pointerId, { ...v, type: e.pointerType });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const el = e.currentTarget as Element;
    const v = toView(e.clientX, e.clientY, el);
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { ...v, type: prev.type });
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (pinch.current) {
        const factor = dist / (pinch.current.dist || dist);
        zoomAround(mx, my, factor);
        setT((p2) => clamp({ ...p2, x: p2.x + (mx - pinch.current!.mx), y: p2.y + (my - pinch.current!.my) }));
      }
      pinch.current = { dist, mx, my };
    } else if (prev.type === 'mouse' || kRef.current > 1.01) {
      // 마우스 단일 드래그는 항상 팬. 터치 단일은 확대 상태에서만 팬(기본 줌에선 페이지 스크롤 양보).
      setT((p2) => clamp({ ...p2, x: p2.x + (v.x - prev.x), y: p2.y + (v.y - prev.y) }));
    }
  }, [clamp, zoomAround]);

  const endPointer = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const v = toView(e.clientX, e.clientY, e.currentTarget as Element);
    zoomAround(v.x, v.y, e.deltaY < 0 ? 1.2 : 1 / 1.2);
  }, [zoomAround]);

  const zoomIn = useCallback(() => zoomAround(W / 2, H / 2, 1.6), [zoomAround, W, H]);
  const zoomOut = useCallback(() => zoomAround(W / 2, H / 2, 1 / 1.6), [zoomAround, W, H]);
  const reset = useCallback(() => setT({ k: 1, x: 0, y: 0 }), []);
  const centerOn = useCallback((vx: number, vy: number, k = 4) => {
    setT(() => clamp({ k, x: W / 2 - vx * k, y: H / 2 - vy * k }));
  }, [clamp, W, H]);

  return {
    transform: t,
    transformStr: `translate(${t.x} ${t.y}) scale(${t.k})`,
    bind: { onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer, onWheel },
    zoomIn, zoomOut, reset, isZoomed: t.k > 1.01, centerOn,
  };
}
