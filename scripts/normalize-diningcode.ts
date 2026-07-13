import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseAddress } from '../src/lib/addressParser';
import { buildMapLinks } from '../src/lib/mapLinks';
import { canonicalSido } from '../src/lib/sido';
import type { Category } from '../src/lib/categories';
import type { Restaurant } from '../src/types';

interface Poi {
  v_rid: string; nm: string; branch: string | null; addr: string; road_addr: string;
  phone: string; category: string; area: string[]; lat: number; lng: number; image: string | null;
  image_list?: string[];
  score?: number; // 다이닝코드 r_score (랭킹 점수)
}

// 다이닝코드 category/메뉴 문자열 → 앱 카테고리 분류
function classify(text: string): Category {
  const s = text;
  if (/파스타|피자|스테이크|리조또|브런치|양식|햄버거/.test(s)) return '양식';
  if (/초밥|스시|사시미|돈까스|돈카츠|텐동|이자카야|일식|라멘|라멘|오마카세/.test(s)) return '일식';
  if (/짜장|짬뽕|중식|중국집|마라|양꼬치|딤섬|탕수육/.test(s)) return '중식';
  if (/떡볶이|분식|김밥|순대|튀김|어묵/.test(s)) return '분식';
  if (/카페|디저트|베이커리|빵집|커피|케이크|제과/.test(s)) return '카페·디저트';
  if (/회|물회|해물|해산물|조개|생선|장어|게장|굴|낙지|오징어|멸치|아귀|아구|대게|참치|전복|성게|문어|꼬막|새우|복요리|복국|간재미|홍어|과메기/.test(s)) return '해산물';
  if (/갈비|삼겹|막창|곱창|대창|불고기|정육|고깃집|주물럭|수육|보쌈|족발|닭갈비|숯불|양념육|한우|돼지고기|소고기|오리/.test(s)) return '고기';
  if (/국수|냉면|칼국수|우동|소바|막국수|잔치국수|밀면/.test(s)) return '면';
  return '한식';
}

function parseMenus(category: string): string[] {
  return category.split(/[,·/]/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
}

function regionOf(addr: string): Restaurant['region'] {
  const parsed = parseAddress(addr);
  if (parsed) return { sido: parsed.sido, sigungu: parsed.sigungu, emd: parsed.emd };
  // fallback: 토큰에서 시도/시군구만 추출
  const t = addr.trim().split(/\s+/);
  const sido = canonicalSido(t[0] ?? '') ?? (t[0] ?? '');
  return { sido, sigungu: t[1] ?? '', emd: t[2] ?? '' };
}

const raw = JSON.parse(readFileSync('scripts/raw/diningcode.json', 'utf8')) as Poi[];

// 다이닝코드 r_score(랭킹 점수) 내림차순 = 추천순. 앱은 배열 순서를 보존하므로
// 여기서 정렬하면 각 지역 리스트가 추천순으로 표시된다.
raw.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

const out: Restaurant[] = raw
  .filter((p) => p.nm && p.lat && p.lng)
  .map((p) => {
    const region = regionOf(p.addr || p.road_addr || '');
    const menus = parseMenus(p.category || '');
    return {
      id: `dc-${p.v_rid}`,
      name: p.branch ? `${p.nm} ${p.branch}` : p.nm,
      region,
      address: p.road_addr || p.addr || '',
      coord: { lat: p.lat, lng: p.lng },
      menus,
      signatureMenu: menus[0] ?? null,
      category: classify(`${p.category} ${p.nm}`),
      image: p.image || (p.image_list && p.image_list[0]) || null,
      images: (p.image_list && p.image_list.length ? p.image_list : (p.image ? [p.image] : [])).slice(0, 6),
      episode: { season: null, no: null, airDate: null },
      links: {
        ...buildMapLinks(p.nm, region.sigungu),
        diningcode: `https://www.diningcode.com/profile.php?rid=${p.v_rid}`,
      },
      confidence: 'high',
      sources: [`https://www.diningcode.com/profile.php?rid=${p.v_rid}`],
    } satisfies Restaurant;
  })
  // 시도 정규화 실패한 레코드는 제외 (지도에 못 얹음)
  .filter((r) => canonicalSido(r.region.sido) !== null);

const outPath = 'public/data/restaurants.json';
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));

const bySido: Record<string, number> = {};
for (const r of out) bySido[r.region.sido] = (bySido[r.region.sido] ?? 0) + 1;
console.log(`normalize-diningcode: ${out.length} restaurants`);
console.log(Object.entries(bySido).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
