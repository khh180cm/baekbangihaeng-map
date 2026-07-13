import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// 다이닝코드 내부 검색 API. offset/page가 무시되고 한 번에 최대 100개만 오므로,
// 시/군/구 단위(각 버킷 <100)로 훑어 전수 수집하고 v_rid로 중복 제거한다.
const API = 'https://im.diningcode.com/API/isearch/';
const QUERY = '식객허영만의백반기행';

const SHORT_SIDO: Record<string, string> = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천',
  '광주광역시': '광주', '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
  '경기도': '경기', '강원특별자치도': '강원', '충청북도': '충북', '충청남도': '충남',
  '전북특별자치도': '전북', '전라남도': '전남', '경상북도': '경북', '경상남도': '경남',
  '제주특별자치도': '제주',
};

interface Poi {
  v_rid: string; nm: string; branch: string | null; addr: string; road_addr: string;
  phone: string; category: string; keyword: { term: string; mark: number }[];
  area: string[]; lat: number; lng: number; image: string | null; score: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function search(addr: string): Promise<Poi[]> {
  const body = new URLSearchParams({ query: QUERY, addr, from: '0', size: '100' });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j: any = await res.json();
      const list: Poi[] = j?.result_data?.poi_section?.list ?? [];
      return list.filter((p) => (p.keyword ?? []).some((k) => k.term === QUERY && k.mark === 1));
    } catch (e) {
      if (attempt === 2) { console.warn(`  ! ${addr}: ${(e as Error).message}`); return []; }
      await sleep(400);
    }
  }
  return [];
}

async function main() {
  const sigungu = JSON.parse(readFileSync('public/geo/sigungu-centroids.json', 'utf8')) as Array<{ sido: string; sigungu: string }>;

  // 질의 대상: 17개 시/도(안전망) + 250개 시/군/구(전수)
  const queries: string[] = [];
  for (const short of new Set(Object.values(SHORT_SIDO))) queries.push(short);
  for (const r of sigungu) {
    const short = SHORT_SIDO[r.sido] ?? r.sido;
    queries.push(`${short} ${r.sigungu}`);
  }

  const byId = new Map<string, Poi>();
  let done = 0;
  for (const q of queries) {
    const pois = await search(q);
    for (const p of pois) if (p.v_rid && !byId.has(p.v_rid)) byId.set(p.v_rid, p);
    done++;
    if (done % 25 === 0) console.log(`  ${done}/${queries.length} queries, ${byId.size} unique so far`);
    await sleep(80);
  }

  const all = [...byId.values()];
  mkdirSync('scripts/raw', { recursive: true });
  writeFileSync('scripts/raw/diningcode.json', JSON.stringify(all, null, 2));
  console.log(`fetch-diningcode: ${queries.length} queries -> ${all.length} unique restaurants`);
}

main();
