import { useCallback, useRef, useState } from 'react';

export interface Transform { k: number; x: number; y: number; }

interface PanZoom {
  transform: Transform;
  transformStr: string;
  bind: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
  };
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  isZoomed: boolean;
  centerOn: (vx: number, vy: number, k?: number) => void;
}

const fin = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback);

/**
 * SVG 콘텐츠(viewBox W×H)에 대한 팬/줌. 손가락 핀치·드래그, 마우스 휠/드래그,
 * +/- 버튼을 지원한다. 모든 좌표 연산은 NaN/Infinity를 방어해 흰 화면을 막는다.
 */
export function usePanZoom(W: number, H: number, minK = 1, maxK = 9): PanZoom {
  const [t, setT] = useState<Transform>({ k: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; mx: number; my: number } | null>(null);

  const clamp = useCallback((n: Transform): Transform => {
    let k = fin(n.k, 1);
    k = Math.max(minK, Math.min(maxK, k));
    const x = fin(n.x, 0), y = fin(n.y, 0);
    const minX = W * (1 - k), minY = H * (1 - k);
    return { k, x: Math.max(minX, Math.min(0, x)), y: Math.max(minY, Math.min(0, y)) };
  }, [W, H, minK, maxK]);

  // client 좌표 → viewBox 좌표. 레이아웃이 0이면 null(무시).
  const toView = (clientX: number, clientY: number, el: Element) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  };

  const zoomAround = useCallback((vx: number, vy: number, factor: number) => {
    if (!Number.isFinite(factor) || factor <= 0) return;
    setT((prev) => {
      const k2 = Math.max(minK, Math.min(maxK, prev.k * factor));
      const f = k2 / prev.k;
      return clamp({ k: k2, x: vx - (vx - prev.x) * f, y: vy - (vy - prev.y) * f });
    });
  }, [clamp, minK, maxK]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const v = toView(e.clientX, e.clientY, e.currentTarget as Element);
    if (v) pointers.current.set(e.pointerId, v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const v = toView(e.clientX, e.clientY, e.currentTarget as Element);
    if (!v) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, v);
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const prevPinch = pinch.current;
      // 값을 지역 변수로 캡처(비동기 setT 콜백에서 pinch.current(null 가능) 참조 금지)
      if (prevPinch && prevPinch.dist > 0 && dist > 0) {
        const dmx = mx - prevPinch.mx, dmy = my - prevPinch.my;
        zoomAround(mx, my, dist / prevPinch.dist);
        setT((p2) => clamp({ ...p2, x: p2.x + dmx, y: p2.y + dmy }));
      }
      pinch.current = { dist, mx, my };
    } else {
      // 단일 포인터 드래그 = 팬(지도는 고정 영역이라 페이지 스크롤과 충돌하지 않음)
      setT((p2) => clamp({ ...p2, x: p2.x + (v.x - prev.x), y: p2.y + (v.y - prev.y) }));
    }
  }, [clamp, zoomAround]);

  const endPointer = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const v = toView(e.clientX, e.clientY, e.currentTarget as Element);
    if (v) zoomAround(v.x, v.y, e.deltaY < 0 ? 1.2 : 1 / 1.2);
  }, [zoomAround]);

  const zoomIn = useCallback(() => zoomAround(W / 2, H / 2, 1.6), [zoomAround, W, H]);
  const zoomOut = useCallback(() => zoomAround(W / 2, H / 2, 1 / 1.6), [zoomAround, W, H]);
  const reset = useCallback(() => { pointers.current.clear(); pinch.current = null; setT({ k: 1, x: 0, y: 0 }); }, []);
  const centerOn = useCallback((vx: number, vy: number, k = 4) => {
    setT(() => clamp({ k, x: W / 2 - vx * k, y: H / 2 - vy * k }));
  }, [clamp, W, H]);

  return {
    transform: t,
    transformStr: `translate(${fin(t.x)} ${fin(t.y)}) scale(${fin(t.k, 1)})`,
    bind: { onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer, onPointerLeave: endPointer, onWheel },
    zoomIn, zoomOut, reset, isZoomed: t.k > 1.01, centerOn,
  };
}
