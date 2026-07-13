export interface Pt { id: string; x: number; y: number }
export interface Cluster { x: number; y: number; items: Pt[] }

/**
 * 화면 좌표 기준 그리디 클러스터링. radius 이내의 점들을 하나로 묶는다.
 * 줌하면 점 좌표가 벌어져(radius는 고정) 클러스터가 쪼개진다.
 */
export function clusterPoints(points: Pt[], radius: number): Cluster[] {
  const clusters: Cluster[] = [];
  const r2 = radius * radius;
  for (const p of points) {
    let best: Cluster | null = null;
    let bestD = r2;
    for (const c of clusters) {
      const dx = c.x - p.x, dy = c.y - p.y;
      const d = dx * dx + dy * dy;
      if (d <= bestD) { bestD = d; best = c; }
    }
    if (best) {
      best.items.push(p);
      const n = best.items.length;
      best.x += (p.x - best.x) / n;
      best.y += (p.y - best.y) / n;
    } else {
      clusters.push({ x: p.x, y: p.y, items: [p] });
    }
  }
  return clusters;
}
