import { useEffect, useState } from 'react';

/** public/ 아래 정적 JSON을 fetch하는 훅. 빈 URL이면 요청을 건너뛴다. */
export function useGeo<T = any>(url: string): { data: T | null } {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (alive) setData(d); })
      .catch(() => { /* 정적 파일 로드 실패는 무시 (빈 상태 유지) */ });
    return () => { alive = false; };
  }, [url]);
  return { data };
}
