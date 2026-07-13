# 백반기행 맛집 지도 — Plan 1: 앱 기반 + 프론트엔드 (시드 데이터) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소규모 시드 데이터로 백반기행 맛집을 SVG 지도(전국→시/도 2단계)에서 탐색하는, 끝까지 동작·테스트되는 React+Vite 정적 SPA를 만든다.

**Architecture:** 데이터(`restaurants.json`)와 경계 GeoJSON은 빌드 시 준비하고 앱은 런타임 네트워크 호출 없이 이를 소비한다. 좌표는 주소를 읍/면/동 경계 중심점으로 근사해 부여한다. 지도는 d3-geo 투영으로 그리고, 식당 점은 같은 투영으로 얹는다. 상태는 zustand로 관리한다.

**Tech Stack:** Vite 5, React 18, TypeScript(strict), d3-geo 3, d3-array, topojson-client 3, zustand 4, Vitest, @testing-library/react, Playwright.

## Global Constraints

- Node >= 18, 패키지 매니저 = npm
- TypeScript `strict: true`
- 앱 런타임에 외부 네트워크 호출 없음 — 모든 데이터는 빌드 시 번들/정적 파일
- 지도 링크는 전부 **키 불필요 검색 URL** 형식 (`buildMapLinks` 사용)
- 좌표는 **읍/면/동 중심점 + 결정적 jitter**; 매칭 실패 시 `coord: null` ("위치 미확인")
- 데이터 스키마의 단일 출처는 `src/types.ts`의 `Restaurant`
- 시/도 명칭은 `src/lib/sido.ts`의 `canonicalSido`를 통해서만 정규화(지도 데이터·주소 양쪽 동일 함수 사용)
- 모든 랜덤/시간 의존 로직은 결정적으로(테스트 가능하게) 구현

---

### Task 1: 프로젝트 스캐폴드

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `vitest.config.ts`, `src/test/smoke.test.ts`
- Create: `playwright.config.ts`

**Interfaces:**
- Consumes: (없음)
- Produces: 동작하는 dev/build/test 하네스. `npm test`(vitest), `npm run dev`, `npm run build`, `npm run e2e`(playwright) 스크립트.

- [ ] **Step 1: Vite 프로젝트 생성 및 의존성 설치**

```bash
npm create vite@latest . -- --template react-ts
npm install d3-geo d3-array topojson-client zustand
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/d3-geo @types/topojson-client @playwright/test tsx
npx playwright install chromium
```

- [ ] **Step 2: `package.json` scripts 설정**

`package.json`의 `"scripts"`를 다음으로 교체:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test",
  "build:geo": "tsx scripts/build-geo.ts",
  "assign:coords": "tsx scripts/assign-coords.ts src/data/restaurants.seed.json src/data/restaurants.json",
  "validate:data": "tsx scripts/validate-data.ts src/data/restaurants.json"
}
```

- [ ] **Step 3: `vitest.config.ts` 생성**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: `playwright.config.ts` 생성**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
  use: { baseURL: 'http://localhost:5173' },
});
```

- [ ] **Step 5: 스모크 테스트 작성**

Create `src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: 테스트 실행하여 통과 확인**

Run: `npm test`
Expected: 1 passed

- [ ] **Step 7: `tsconfig.json`에 strict 및 scripts 포함 확인**

`tsconfig.json`(또는 `tsconfig.app.json`)에 `"strict": true` 확인. 루트 `tsconfig.json`의 `include`에 `"scripts"`가 포함되도록 추가(없으면 `"include": ["src", "scripts"]`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+TS with vitest and playwright"
```

---

### Task 2: 도메인 타입 · 카테고리 · 시드 데이터

**Files:**
- Create: `src/lib/categories.ts`, `src/types.ts`, `src/data/restaurants.seed.json`
- Test: `src/lib/categories.test.ts`, `src/data/seed.test.ts`

**Interfaces:**
- Consumes: (없음)
- Produces:
  - `categories.ts`: `CATEGORIES: readonly Category[]`, `type Category`, `categoryIcon(c: Category): string`
  - `types.ts`: `interface Restaurant`, `interface Region`, `interface Episode`, `type Coord = { lat: number; lng: number }`
  - `restaurants.seed.json`: `Restaurant[]` (단, `coord`는 아직 `null`)

- [ ] **Step 1: 카테고리 테스트 작성**

Create `src/lib/categories.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CATEGORIES, categoryIcon } from './categories';

describe('categories', () => {
  it('includes 기타 as fallback category', () => {
    expect(CATEGORIES).toContain('기타');
  });
  it('returns an icon for every category', () => {
    for (const c of CATEGORIES) {
      expect(categoryIcon(c)).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- categories`
Expected: FAIL ("Cannot find module './categories'")

- [ ] **Step 3: `categories.ts` 구현**

```ts
export const CATEGORIES = [
  '한식', '해산물', '고기', '면', '분식',
  '중식', '일식', '양식', '카페·디저트', '기타',
] as const;

export type Category = (typeof CATEGORIES)[number];

const ICONS: Record<Category, string> = {
  '한식': '🍚', '해산물': '🦐', '고기': '🥩', '면': '🍜', '분식': '🍢',
  '중식': '🥟', '일식': '🍣', '양식': '🍝', '카페·디저트': '☕', '기타': '🍽️',
};

export function categoryIcon(c: Category): string {
  return ICONS[c] ?? ICONS['기타'];
}
```

- [ ] **Step 4: `types.ts` 구현**

```ts
import type { Category } from './lib/categories';

export type Coord = { lat: number; lng: number };

export interface Region {
  sido: string;    // canonicalSido 결과값 (예: "서울특별시")
  sigungu: string; // 예: "종로구"
  emd: string;     // 읍/면/동 (예: "관철동")
}

export interface Episode {
  season: number;          // 기수
  no: number | null;       // 회차
  airDate: string | null;  // ISO yyyy-mm-dd
}

export interface Restaurant {
  id: string;
  name: string;
  region: Region;
  address: string;
  coord: Coord | null;     // null => 위치 미확인
  menus: string[];
  signatureMenu: string | null;
  category: Category;
  episode: Episode;
  links: { naver: string; kakao: string };
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}
```

- [ ] **Step 5: 시드 데이터 작성**

Create `src/data/restaurants.seed.json` — 최소 12곳, 최소 3개 시/도(서울/부산/강원 권장)에 걸쳐, **주소가 명확한(시/도 시/군/구 읍/면/동 …)** 실제성 있는 예시로 작성. `coord`는 `null`로 두고 Task 8에서 채운다. `links`도 빈 문자열로 두고 Task 8에서 생성한다. 각 레코드는 `Restaurant` 스키마를 정확히 따른다. 예시 2건(나머지는 동일 형식으로 총 12건 이상 채운다):

```json
[
  {
    "id": "seoul-jongno-1",
    "name": "예시식당",
    "region": { "sido": "서울특별시", "sigungu": "종로구", "emd": "관철동" },
    "address": "서울특별시 종로구 관철동 12-3",
    "coord": null,
    "menus": ["물회", "매운탕"],
    "signatureMenu": "물회",
    "category": "해산물",
    "episode": { "season": 12, "no": 145, "airDate": "2023-05-06" },
    "links": { "naver": "", "kakao": "" },
    "confidence": "high",
    "sources": []
  },
  {
    "id": "busan-jung-1",
    "name": "예시국밥",
    "region": { "sido": "부산광역시", "sigungu": "중구", "emd": "부평동" },
    "address": "부산광역시 중구 부평동 2가",
    "coord": null,
    "menus": ["돼지국밥"],
    "signatureMenu": "돼지국밥",
    "category": "한식",
    "episode": { "season": 8, "no": 96, "airDate": "2021-11-13" },
    "links": { "naver": "", "kakao": "" },
    "confidence": "high",
    "sources": []
  }
]
```

> 주의: 실제 존재하는 읍/면/동 이름을 사용해야 Task 8 좌표 매칭이 성공한다. 서울/부산은 자치구+법정동, 강원은 "강릉시 OO동/OO면" 형태로 명확히.

- [ ] **Step 6: 시드 스키마 검증 테스트 작성**

Create `src/data/seed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import seed from './restaurants.seed.json';
import type { Restaurant } from '../types';
import { CATEGORIES } from '../lib/categories';

describe('seed data', () => {
  const list = seed as unknown as Restaurant[];

  it('has at least 12 restaurants across >= 3 sido', () => {
    expect(list.length).toBeGreaterThanOrEqual(12);
    const sido = new Set(list.map((r) => r.region.sido));
    expect(sido.size).toBeGreaterThanOrEqual(3);
  });

  it('every record has required fields and a valid category', () => {
    for (const r of list) {
      expect(r.id).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r.region.sido && r.region.sigungu && r.region.emd).toBeTruthy();
      expect(r.address).toBeTruthy();
      expect(Array.isArray(r.menus)).toBe(true);
      expect(CATEGORIES).toContain(r.category);
    }
  });

  it('has unique ids', () => {
    const ids = list.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 7: 테스트 실행하여 통과 확인**

Run: `npm test -- categories seed`
Expected: PASS (모든 테스트)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: domain types, categories, and seed dataset"
```

---

### Task 3: 시/도 명칭 정규화 (`lib/sido.ts`)

**Files:**
- Create: `src/lib/sido.ts`
- Test: `src/lib/sido.test.ts`

**Interfaces:**
- Consumes: (없음)
- Produces: `SIDO_LIST: readonly Sido[]`, `type Sido`, `canonicalSido(raw: string): Sido | null`

- [ ] **Step 1: 테스트 작성**

Create `src/lib/sido.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canonicalSido, SIDO_LIST } from './sido';

describe('canonicalSido', () => {
  it('normalizes short and long and legacy names to one canonical value', () => {
    expect(canonicalSido('서울')).toBe('서울특별시');
    expect(canonicalSido('서울특별시')).toBe('서울특별시');
    expect(canonicalSido('강원')).toBe('강원특별자치도');
    expect(canonicalSido('강원도')).toBe('강원특별자치도'); // 2018 지도 명칭도 흡수
    expect(canonicalSido('전라북도')).toBe('전북특별자치도');
    expect(canonicalSido('제주')).toBe('제주특별자치도');
  });
  it('returns null for unknown', () => {
    expect(canonicalSido('없는도')).toBeNull();
  });
  it('SIDO_LIST has 17 entries', () => {
    expect(SIDO_LIST.length).toBe(17);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- sido`
Expected: FAIL ("Cannot find module './sido'")

- [ ] **Step 3: `sido.ts` 구현**

```ts
export const SIDO_LIST = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
  '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도',
  '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도',
  '경상남도', '제주특별자치도',
] as const;

export type Sido = (typeof SIDO_LIST)[number];

// 모든 변형(약칭·구명칭·2018 지도명칭)을 캐논값으로 매핑
const ALIAS: Record<string, Sido> = {
  '서울': '서울특별시', '서울특별시': '서울특별시', '서울시': '서울특별시',
  '부산': '부산광역시', '부산광역시': '부산광역시',
  '대구': '대구광역시', '대구광역시': '대구광역시',
  '인천': '인천광역시', '인천광역시': '인천광역시',
  '광주': '광주광역시', '광주광역시': '광주광역시',
  '대전': '대전광역시', '대전광역시': '대전광역시',
  '울산': '울산광역시', '울산광역시': '울산광역시',
  '세종': '세종특별자치시', '세종시': '세종특별자치시', '세종특별자치시': '세종특별자치시',
  '경기': '경기도', '경기도': '경기도',
  '강원': '강원특별자치도', '강원도': '강원특별자치도', '강원특별자치도': '강원특별자치도',
  '충북': '충청북도', '충청북도': '충청북도',
  '충남': '충청남도', '충청남도': '충청남도',
  '전북': '전북특별자치도', '전라북도': '전북특별자치도', '전북특별자치도': '전북특별자치도',
  '전남': '전라남도', '전라남도': '전라남도',
  '경북': '경상북도', '경상북도': '경상북도',
  '경남': '경상남도', '경상남도': '경상남도',
  '제주': '제주특별자치도', '제주도': '제주특별자치도', '제주특별자치도': '제주특별자치도',
};

export function canonicalSido(raw: string): Sido | null {
  const key = raw.trim();
  return ALIAS[key] ?? null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- sido`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: canonical sido normalization shared by map data and addresses"
```

---

### Task 4: 주소 파서 (`lib/addressParser.ts`)

**Files:**
- Create: `src/lib/addressParser.ts`
- Test: `src/lib/addressParser.test.ts`

**Interfaces:**
- Consumes: `canonicalSido`, `type Sido` (Task 3)
- Produces: `parseAddress(addr: string): { sido: Sido; sigungu: string; emd: string } | null`

- [ ] **Step 1: 테스트 작성**

Create `src/lib/addressParser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseAddress } from './addressParser';

describe('parseAddress', () => {
  it('parses a metropolitan address (자치구 + 법정동)', () => {
    expect(parseAddress('서울특별시 종로구 관철동 12-3')).toEqual({
      sido: '서울특별시', sigungu: '종로구', emd: '관철동',
    });
  });
  it('parses a short sido alias', () => {
    expect(parseAddress('부산 중구 부평동 2가')).toEqual({
      sido: '부산광역시', sigungu: '중구', emd: '부평동',
    });
  });
  it('parses a 도 address with 시 + 동', () => {
    expect(parseAddress('강원 강릉시 임당동 111')).toEqual({
      sido: '강원특별자치도', sigungu: '강릉시', emd: '임당동',
    });
  });
  it('parses a 시 + 구 sigungu (도 산하 일반구)', () => {
    expect(parseAddress('경기 수원시 팔달구 인계동 1')).toEqual({
      sido: '경기도', sigungu: '수원시 팔달구', emd: '인계동',
    });
  });
  it('returns null on unparseable input', () => {
    expect(parseAddress('그냥 텍스트')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- addressParser`
Expected: FAIL ("Cannot find module './addressParser'")

- [ ] **Step 3: `addressParser.ts` 구현**

```ts
import { canonicalSido, type Sido } from './sido';

export interface ParsedAddress {
  sido: Sido;
  sigungu: string;
  emd: string;
}

const SIGUNGU_SUFFIX = /(시|군|구)$/;
const EMD_SUFFIX = /(읍|면|동|가)$/;

export function parseAddress(addr: string): ParsedAddress | null {
  const tokens = addr.trim().split(/\s+/);
  if (tokens.length < 3) return null;

  const sido = canonicalSido(tokens[0]);
  if (!sido) return null;

  let i = 1;
  const sigunguParts: string[] = [];
  // 연속된 시/군/구 토큰을 sigungu로 흡수 (예: "수원시" + "팔달구")
  while (i < tokens.length && SIGUNGU_SUFFIX.test(tokens[i])) {
    sigunguParts.push(tokens[i]);
    i++;
  }
  if (sigunguParts.length === 0) return null;

  // 다음 토큰 중 읍/면/동/가로 끝나는 첫 토큰을 emd로
  let emd = '';
  for (let j = i; j < tokens.length; j++) {
    if (EMD_SUFFIX.test(tokens[j])) {
      emd = tokens[j];
      break;
    }
  }
  if (!emd) return null;

  return { sido, sigungu: sigunguParts.join(' '), emd };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- addressParser`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Korean address parser -> {sido, sigungu, emd}"
```

---

### Task 5: 지도 링크 생성 (`lib/mapLinks.ts`)

**Files:**
- Create: `src/lib/mapLinks.ts`
- Test: `src/lib/mapLinks.test.ts`

**Interfaces:**
- Consumes: (없음)
- Produces: `buildMapLinks(name: string, sigungu: string): { naver: string; kakao: string }`

- [ ] **Step 1: 테스트 작성**

Create `src/lib/mapLinks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildMapLinks } from './mapLinks';

describe('buildMapLinks', () => {
  it('builds keyless naver and kakao search URLs with encoded query', () => {
    const { naver, kakao } = buildMapLinks('그림집', '종로구');
    const q = encodeURIComponent('그림집 종로구');
    expect(naver).toBe(`https://map.naver.com/v5/search/${q}`);
    expect(kakao).toBe(`https://map.kakao.com/link/search/${q}`);
  });
  it('trims and handles empty sigungu', () => {
    const { naver } = buildMapLinks('식당', '');
    expect(naver).toBe(`https://map.naver.com/v5/search/${encodeURIComponent('식당')}`);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- mapLinks`
Expected: FAIL

- [ ] **Step 3: `mapLinks.ts` 구현**

```ts
export function buildMapLinks(
  name: string,
  sigungu: string,
): { naver: string; kakao: string } {
  const q = encodeURIComponent(`${name} ${sigungu}`.trim());
  return {
    naver: `https://map.naver.com/v5/search/${q}`,
    kakao: `https://map.kakao.com/link/search/${q}`,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- mapLinks`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: keyless naver/kakao map link builder"
```

---

### Task 6: 필터 로직 (`lib/filter.ts`)

**Files:**
- Create: `src/lib/filter.ts`
- Test: `src/lib/filter.test.ts`

**Interfaces:**
- Consumes: `Restaurant` (Task 2), `Category` (Task 2)
- Produces: `type FilterState = { category: Category | 'ALL'; season: number | 'ALL'; query: string }`, `EMPTY_FILTER: FilterState`, `filterRestaurants(list: Restaurant[], f: FilterState): Restaurant[]`

- [ ] **Step 1: 테스트 작성**

Create `src/lib/filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterRestaurants, EMPTY_FILTER, type FilterState } from './filter';
import type { Restaurant } from '../types';

const make = (over: Partial<Restaurant>): Restaurant => ({
  id: 'x', name: '식당', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' },
  address: '', coord: null, menus: [], signatureMenu: null, category: '한식',
  episode: { season: 1, no: null, airDate: null }, links: { naver: '', kakao: '' },
  confidence: 'high', sources: [], ...over,
});

describe('filterRestaurants', () => {
  const list = [
    make({ id: 'a', name: '국밥집', category: '한식', episode: { season: 1, no: null, airDate: null } }),
    make({ id: 'b', name: '물회집', category: '해산물', episode: { season: 2, no: null, airDate: null } }),
    make({ id: 'c', name: '국수집', category: '면', menus: ['잔치국수'], episode: { season: 2, no: null, airDate: null } }),
  ];

  it('returns all with EMPTY_FILTER', () => {
    expect(filterRestaurants(list, EMPTY_FILTER)).toHaveLength(3);
  });
  it('filters by category', () => {
    const f: FilterState = { ...EMPTY_FILTER, category: '해산물' };
    expect(filterRestaurants(list, f).map((r) => r.id)).toEqual(['b']);
  });
  it('filters by season', () => {
    const f: FilterState = { ...EMPTY_FILTER, season: 2 };
    expect(filterRestaurants(list, f).map((r) => r.id)).toEqual(['b', 'c']);
  });
  it('matches query against name and menus (case/space insensitive)', () => {
    expect(filterRestaurants(list, { ...EMPTY_FILTER, query: '국' }).map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterRestaurants(list, { ...EMPTY_FILTER, query: '잔치' }).map((r) => r.id)).toEqual(['c']);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- filter`
Expected: FAIL

- [ ] **Step 3: `filter.ts` 구현**

```ts
import type { Restaurant } from '../types';
import type { Category } from './categories';

export interface FilterState {
  category: Category | 'ALL';
  season: number | 'ALL';
  query: string;
}

export const EMPTY_FILTER: FilterState = { category: 'ALL', season: 'ALL', query: '' };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export function filterRestaurants(list: Restaurant[], f: FilterState): Restaurant[] {
  const q = norm(f.query);
  return list.filter((r) => {
    if (f.category !== 'ALL' && r.category !== f.category) return false;
    if (f.season !== 'ALL' && r.episode.season !== f.season) return false;
    if (q) {
      const hay = norm(r.name + ' ' + r.menus.join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- filter`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: restaurant filter by category/season/query"
```

---

### Task 7: 경계 데이터 빌드 스크립트 (`scripts/build-geo.ts`)

**Files:**
- Create: `scripts/build-geo.ts`
- Create (다운로드): `scripts/raw/provinces.topojson.json`, `scripts/raw/municipalities.topojson.json`, `scripts/raw/submunicipalities.topojson.json`
- Output: `public/geo/sido.json`, `public/geo/sigungu/<sidoCode>.json`, `public/geo/emd/<sidoCode>.json`, `public/geo/emd-centroids.json`, `public/geo/sido-index.json`
- Test: `scripts/build-geo.test.ts`

**Interfaces:**
- Consumes: `canonicalSido` (Task 3), topojson-client, d3-geo `geoCentroid`
- Produces:
  - `public/geo/sido.json`: GeoJSON FeatureCollection. 각 feature props: `{ sidoCode: string; sido: Sido }`
  - `public/geo/sigungu/<sidoCode>.json`: props `{ sidoCode; sigunguCode; sido; sigungu }`
  - `public/geo/emd/<sidoCode>.json`: props `{ sidoCode; sigunguCode; emdCode; sido; sigungu; emd }`
  - `public/geo/emd-centroids.json`: `Array<{ sido: Sido; sigungu: string; emd: string; lng: number; lat: number }>`
  - `public/geo/sido-index.json`: `Array<{ sidoCode: string; sido: Sido }>` (17개)

- [ ] **Step 1: 원본 경계 데이터 확보**

`southkorea/southkorea-maps` (통계청 유래) TopoJSON을 `scripts/raw/`에 저장한다. 저장소 레이아웃이 바뀌었을 수 있으니 다운로드 후 파일을 열어 **object 이름과 properties 키(예: `code`, `name`)를 반드시 확인**하고 Step 3의 매핑을 조정한다.

```bash
mkdir -p scripts/raw public/geo/sigungu public/geo/emd
# 예시 URL (레포 확인 후 정확한 경로로 조정):
curl -L -o scripts/raw/provinces.topojson.json \
  https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-provinces-2018-topo-simple.json
curl -L -o scripts/raw/municipalities.topojson.json \
  https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-topo-simple.json
curl -L -o scripts/raw/submunicipalities.topojson.json \
  https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-submunicipalities-2018-topo-simple.json
```

각 파일을 열어: TopoJSON `objects`의 키 이름과, 대표 geometry의 `properties`에서 (a) 행정구역 코드 필드명, (b) 한글 명칭 필드명을 확인해 메모한다. 코드 체계는 계층적(시도=앞 2자리, 시군구=앞 5자리)임을 활용한다.

- [ ] **Step 2: 테스트 먼저 작성**

Create `scripts/build-geo.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

describe('build-geo output', () => {
  beforeAll(() => {
    if (!existsSync('public/geo/sido.json')) {
      execSync('npm run build:geo', { stdio: 'inherit' });
    }
  }, 120_000);

  it('emits 17 sido features with canonical names and codes', () => {
    const fc = read('public/geo/sido.json');
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features.length).toBe(17);
    for (const f of fc.features) {
      expect(f.properties.sido).toBeTruthy();
      expect(f.properties.sidoCode).toMatch(/^\d{2}$/);
    }
  });

  it('emd-centroids are within Korea bbox', () => {
    const centroids = read('public/geo/emd-centroids.json') as Array<{ lng: number; lat: number }>;
    expect(centroids.length).toBeGreaterThan(1000);
    for (const c of centroids) {
      expect(c.lng).toBeGreaterThan(124);
      expect(c.lng).toBeLessThan(132);
      expect(c.lat).toBeGreaterThan(33);
      expect(c.lat).toBeLessThan(39.5);
    }
  });

  it('writes per-sido emd files matching sido-index', () => {
    const index = read('public/geo/sido-index.json') as Array<{ sidoCode: string }>;
    for (const { sidoCode } of index) {
      expect(existsSync(`public/geo/emd/${sidoCode}.json`)).toBe(true);
    }
  });
});
```

- [ ] **Step 3: `build-geo.ts` 구현**

> 아래 `PROP` 상수(원본 properties 키/‑object 이름)는 Step 1에서 확인한 실제 값으로 맞춘다.

```ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import { canonicalSido, type Sido } from '../src/lib/sido';

// Step 1에서 확인한 실제 키/오브젝트명으로 조정할 것
const PROP = {
  provincesObject: 'skorea_provinces_2018_geo',
  municipalitiesObject: 'skorea_municipalities_2018_geo',
  submunicipalitiesObject: 'skorea_submunicipalities_2018_geo',
  code: 'code',   // 행정구역 코드
  name: 'name',   // 한글 명칭
};

const readTopo = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const toFC = (topo: any, objName: string) => feature(topo, topo.objects[objName]) as any;

function sidoCodeOf(code: string): string { return String(code).slice(0, 2); }
function sigunguCodeOf(code: string): string { return String(code).slice(0, 5); }

mkdirSync('public/geo/sigungu', { recursive: true });
mkdirSync('public/geo/emd', { recursive: true });

// --- 시도 ---
const provFC = toFC(readTopo('scripts/raw/provinces.topojson.json'), PROP.provincesObject);
const sidoNameByCode = new Map<string, Sido>();
for (const f of provFC.features) {
  const code = sidoCodeOf(f.properties[PROP.code]);
  const sido = canonicalSido(f.properties[PROP.name]);
  if (!sido) throw new Error(`Unknown sido: ${f.properties[PROP.name]}`);
  f.properties = { sidoCode: code, sido };
  sidoNameByCode.set(code, sido);
}
writeFileSync('public/geo/sido.json', JSON.stringify(provFC));
writeFileSync(
  'public/geo/sido-index.json',
  JSON.stringify([...sidoNameByCode].map(([sidoCode, sido]) => ({ sidoCode, sido }))),
);

// --- 시군구 ---
const muniFC = toFC(readTopo('scripts/raw/municipalities.topojson.json'), PROP.municipalitiesObject);
const sigunguNameByCode = new Map<string, string>();
const sigunguBySido = new Map<string, any[]>();
for (const f of muniFC.features) {
  const raw = String(f.properties[PROP.code]);
  const sidoCode = sidoCodeOf(raw);
  const sigunguCode = sigunguCodeOf(raw);
  const sido = sidoNameByCode.get(sidoCode)!;
  const sigungu = f.properties[PROP.name];
  sigunguNameByCode.set(sigunguCode, sigungu);
  f.properties = { sidoCode, sigunguCode, sido, sigungu };
  if (!sigunguBySido.has(sidoCode)) sigunguBySido.set(sidoCode, []);
  sigunguBySido.get(sidoCode)!.push(f);
}
for (const [sidoCode, features] of sigunguBySido) {
  writeFileSync(`public/geo/sigungu/${sidoCode}.json`, JSON.stringify({ type: 'FeatureCollection', features }));
}

// --- 읍면동 + centroid ---
const emdFC = toFC(readTopo('scripts/raw/submunicipalities.topojson.json'), PROP.submunicipalitiesObject);
const emdBySido = new Map<string, any[]>();
const centroids: Array<{ sido: Sido; sigungu: string; emd: string; lng: number; lat: number }> = [];
for (const f of emdFC.features) {
  const raw = String(f.properties[PROP.code]);
  const sidoCode = sidoCodeOf(raw);
  const sigunguCode = sigunguCodeOf(raw);
  const sido = sidoNameByCode.get(sidoCode)!;
  const sigungu = sigunguNameByCode.get(sigunguCode) ?? '';
  const emd = f.properties[PROP.name];
  f.properties = { sidoCode, sigunguCode, emdCode: raw, sido, sigungu, emd };
  const [lng, lat] = geoCentroid(f);
  centroids.push({ sido, sigungu, emd, lng, lat });
  if (!emdBySido.has(sidoCode)) emdBySido.set(sidoCode, []);
  emdBySido.get(sidoCode)!.push(f);
}
for (const [sidoCode, features] of emdBySido) {
  writeFileSync(`public/geo/emd/${sidoCode}.json`, JSON.stringify({ type: 'FeatureCollection', features }));
}
writeFileSync('public/geo/emd-centroids.json', JSON.stringify(centroids));

console.log(`geo build done: 17 sido, ${centroids.length} emd centroids`);
```

- [ ] **Step 4: 스크립트 실행 및 테스트 통과 확인**

Run: `npm run build:geo && npm test -- build-geo`
Expected: PASS (17 sido, emd centroids > 1000, per-sido 파일 존재). 실패 시 `PROP` 매핑을 원본 파일 기준으로 수정.

- [ ] **Step 5: `.gitignore`에서 대용량 원본 제외, 산출물은 커밋**

`.gitignore`에 `scripts/raw/` 추가(대용량 원본은 커밋하지 않음). `public/geo/`는 앱이 로드하므로 커밋한다.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: build-geo script -> sido/sigungu/emd GeoJSON + emd centroids"
```

---

### Task 8: 좌표 부여 + 링크 채우기 (`geo/centroid.ts`, `scripts/assign-coords.ts`)

**Files:**
- Create: `src/geo/centroid.ts`, `scripts/assign-coords.ts`
- Output: `src/data/restaurants.json`
- Test: `src/geo/centroid.test.ts`, `scripts/assign-coords.test.ts`

**Interfaces:**
- Consumes: `parseAddress` (Task 4), `buildMapLinks` (Task 5), `Restaurant` (Task 2), `emd-centroids.json` (Task 7)
- Produces:
  - `centroid.ts`: `jitter(base: Coord, key: string): Coord` (결정적), `matchCentroid(index: CentroidRow[], p: ParsedAddress): Coord | null`, `type CentroidRow = { sido: string; sigungu: string; emd: string; lng: number; lat: number }`
  - `scripts/assign-coords.ts`: CLI `tsx scripts/assign-coords.ts <in.json> <out.json>` — 각 레코드에 `coord`(매칭 실패 시 null)와 `links` 채워 저장

- [ ] **Step 1: centroid 테스트 작성**

Create `src/geo/centroid.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { jitter, matchCentroid, type CentroidRow } from './centroid';

const index: CentroidRow[] = [
  { sido: '서울특별시', sigungu: '종로구', emd: '관철동', lng: 126.985, lat: 37.569 },
  { sido: '경기도', sigungu: '수원시 팔달구', emd: '인계동', lng: 127.03, lat: 37.27 },
];

describe('jitter', () => {
  it('is deterministic for the same key', () => {
    const base = { lat: 37.5, lng: 127 };
    expect(jitter(base, 'a')).toEqual(jitter(base, 'a'));
  });
  it('produces different offsets for different keys but stays small', () => {
    const base = { lat: 37.5, lng: 127 };
    const a = jitter(base, 'a');
    const b = jitter(base, 'b');
    expect(a).not.toEqual(b);
    expect(Math.abs(a.lat - base.lat)).toBeLessThan(0.01);
  });
});

describe('matchCentroid', () => {
  it('matches by sido+sigungu+emd (exact)', () => {
    expect(matchCentroid(index, { sido: '서울특별시', sigungu: '종로구', emd: '관철동' }))
      .toEqual({ lat: 37.569, lng: 126.985 });
  });
  it('tolerates 시+구 sigungu differences', () => {
    expect(matchCentroid(index, { sido: '경기도', sigungu: '팔달구', emd: '인계동' }))
      .toEqual({ lat: 37.27, lng: 127.03 });
  });
  it('returns null when no emd matches', () => {
    expect(matchCentroid(index, { sido: '서울특별시', sigungu: '종로구', emd: '없는동' })).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- centroid`
Expected: FAIL

- [ ] **Step 3: `centroid.ts` 구현**

```ts
import type { Coord } from '../types';

export interface CentroidRow {
  sido: string; sigungu: string; emd: string; lng: number; lat: number;
}

// 결정적 해시 (문자열 -> [0,1))
function hash01(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function jitter(base: Coord, key: string): Coord {
  const r = 0.004; // 약 ~400m 반경 내
  const dLat = (hash01(key, 1) - 0.5) * 2 * r;
  const dLng = (hash01(key, 2) - 0.5) * 2 * r;
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

const tokens = (s: string) => s.split(/\s+/).filter(Boolean);
function sigunguMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const ta = tokens(a), tb = tokens(b);
  // 한쪽이 다른 쪽의 마지막 토큰(구)을 포함하면 허용 (예: "수원시 팔달구" vs "팔달구")
  return ta[ta.length - 1] === tb[tb.length - 1];
}

export function matchCentroid(
  index: CentroidRow[],
  p: { sido: string; sigungu: string; emd: string },
): Coord | null {
  const row = index.find(
    (r) => r.sido === p.sido && r.emd === p.emd && sigunguMatch(r.sigungu, p.sigungu),
  );
  return row ? { lat: row.lat, lng: row.lng } : null;
}
```

- [ ] **Step 4: centroid 테스트 통과 확인**

Run: `npm test -- centroid`
Expected: PASS

- [ ] **Step 5: `assign-coords.ts` 구현**

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { parseAddress } from '../src/lib/addressParser';
import { buildMapLinks } from '../src/lib/mapLinks';
import { matchCentroid, jitter, type CentroidRow } from '../src/geo/centroid';
import type { Restaurant } from '../src/types';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) throw new Error('usage: assign-coords <in.json> <out.json>');

const list = JSON.parse(readFileSync(inPath, 'utf8')) as Restaurant[];
const index = JSON.parse(readFileSync('public/geo/emd-centroids.json', 'utf8')) as CentroidRow[];

let matched = 0;
const out = list.map((r) => {
  const parsed = parseAddress(r.address);
  let coord = null as Restaurant['coord'];
  if (parsed) {
    const base = matchCentroid(index, parsed);
    if (base) { coord = jitter(base, r.id); matched++; }
  }
  return {
    ...r,
    coord,
    confidence: coord ? r.confidence : ('low' as const),
    links: buildMapLinks(r.name, r.region.sigungu),
  };
});

writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`assign-coords: ${matched}/${list.length} matched -> ${outPath}`);
```

- [ ] **Step 6: assign-coords 통합 테스트 작성**

Create `scripts/assign-coords.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type { Restaurant } from '../src/types';

describe('assign-coords on seed', () => {
  beforeAll(() => {
    if (!existsSync('public/geo/emd-centroids.json')) execSync('npm run build:geo', { stdio: 'inherit' });
    execSync('npm run assign:coords', { stdio: 'inherit' });
  }, 120_000);

  it('produces restaurants.json with links filled and most coords matched', () => {
    const list = JSON.parse(readFileSync('src/data/restaurants.json', 'utf8')) as Restaurant[];
    expect(list.length).toBeGreaterThanOrEqual(12);
    for (const r of list) {
      expect(r.links.naver).toContain('map.naver.com');
      expect(r.links.kakao).toContain('map.kakao.com');
    }
    const withCoord = list.filter((r) => r.coord !== null);
    expect(withCoord.length).toBeGreaterThanOrEqual(Math.ceil(list.length * 0.8));
    for (const r of withCoord) {
      expect(r.coord!.lat).toBeGreaterThan(33);
      expect(r.coord!.lat).toBeLessThan(39.5);
    }
  });
});
```

- [ ] **Step 7: 실행 및 테스트 통과 확인**

Run: `npm test -- assign-coords`
Expected: PASS. 80% 미만 매칭 시 시드 주소의 읍/면/동 표기를 실제 명칭에 맞게 수정.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: assign emd-centroid coords + map links to restaurants"
```

---

### Task 9: 투영 헬퍼 (`geo/projection.ts`)

**Files:**
- Create: `src/geo/projection.ts`
- Test: `src/geo/projection.test.ts`

**Interfaces:**
- Consumes: d3-geo, `Coord` (Task 2)
- Produces:
  - `createProjection(fc: FeatureCollection, width: number, height: number): GeoProjection` (fitSize)
  - `pathFor(projection): GeoPath`
  - `projectCoord(projection, c: Coord): [number, number] | null`

- [ ] **Step 1: 테스트 작성**

Create `src/geo/projection.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createProjection, projectCoord } from './projection';

// 남한을 대략 감싸는 사각형 FC
const fc = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature', properties: {},
    geometry: { type: 'Polygon', coordinates: [[[124, 33], [132, 33], [132, 39], [124, 39], [124, 33]]] },
  }],
} as any;

describe('projection', () => {
  it('projects a coord inside the viewport bounds', () => {
    const p = createProjection(fc, 800, 600);
    const xy = projectCoord(p, { lat: 36, lng: 128 });
    expect(xy).not.toBeNull();
    expect(xy![0]).toBeGreaterThanOrEqual(0);
    expect(xy![0]).toBeLessThanOrEqual(800);
    expect(xy![1]).toBeGreaterThanOrEqual(0);
    expect(xy![1]).toBeLessThanOrEqual(600);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- projection`
Expected: FAIL

- [ ] **Step 3: `projection.ts` 구현**

```ts
import { geoMercator, geoPath, type GeoProjection, type GeoPath } from 'd3-geo';
import type { Coord } from '../types';

export function createProjection(fc: any, width: number, height: number): GeoProjection {
  return geoMercator().fitSize([width, height], fc);
}

export function pathFor(projection: GeoProjection): GeoPath {
  return geoPath(projection);
}

export function projectCoord(projection: GeoProjection, c: Coord): [number, number] | null {
  const xy = projection([c.lng, c.lat]);
  return xy as [number, number] | null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- projection`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: d3-geo projection helpers (fitSize, path, projectCoord)"
```

---

### Task 10: 전역 상태 스토어 (`store.ts`)

**Files:**
- Create: `src/store.ts`
- Test: `src/store.test.ts`

**Interfaces:**
- Consumes: `Restaurant` (Task 2), `FilterState`/`EMPTY_FILTER`/`filterRestaurants` (Task 6), `Sido` (Task 3)
- Produces: `useStore` (zustand). State: `restaurants: Restaurant[]`, `selectedSido: Sido | null`, `selectedId: string | null`, `hoveredId: string | null`, `filter: FilterState`. Actions: `setRestaurants`, `selectSido`, `backToNational`, `selectRestaurant`, `hoverRestaurant`, `setFilter`. Selectors: `visibleRestaurants(state): Restaurant[]` (선택 시/도 + 필터 적용), `countBySido(state): Record<string, number>`

- [ ] **Step 1: 테스트 작성**

Create `src/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, visibleRestaurants, countBySido } from './store';
import type { Restaurant } from './types';

const make = (over: Partial<Restaurant>): Restaurant => ({
  id: 'x', name: '식당', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' },
  address: '', coord: { lat: 37.5, lng: 127 }, menus: [], signatureMenu: null, category: '한식',
  episode: { season: 1, no: null, airDate: null }, links: { naver: '', kakao: '' },
  confidence: 'high', sources: [], ...over,
});

const data = [
  make({ id: 'a', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' }, category: '한식' }),
  make({ id: 'b', region: { sido: '서울특별시', sigungu: '중구', emd: '명동' }, category: '면' }),
  make({ id: 'c', region: { sido: '부산광역시', sigungu: '중구', emd: '부평동' }, category: '한식' }),
];

describe('store', () => {
  beforeEach(() => {
    useStore.setState({ restaurants: [], selectedSido: null, selectedId: null, hoveredId: null });
    useStore.getState().setRestaurants(data);
    useStore.getState().setFilter({ category: 'ALL', season: 'ALL', query: '' });
  });

  it('countBySido counts all restaurants per sido', () => {
    expect(countBySido(useStore.getState())).toEqual({ '서울특별시': 2, '부산광역시': 1 });
  });

  it('visibleRestaurants is empty until a sido is selected', () => {
    expect(visibleRestaurants(useStore.getState())).toHaveLength(0);
  });

  it('visibleRestaurants returns filtered restaurants of the selected sido', () => {
    useStore.getState().selectSido('서울특별시');
    expect(visibleRestaurants(useStore.getState()).map((r) => r.id)).toEqual(['a', 'b']);
    useStore.getState().setFilter({ category: '면', season: 'ALL', query: '' });
    expect(visibleRestaurants(useStore.getState()).map((r) => r.id)).toEqual(['b']);
  });

  it('backToNational clears sido and selection', () => {
    useStore.getState().selectSido('서울특별시');
    useStore.getState().selectRestaurant('a');
    useStore.getState().backToNational();
    expect(useStore.getState().selectedSido).toBeNull();
    expect(useStore.getState().selectedId).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- store`
Expected: FAIL

- [ ] **Step 3: `store.ts` 구현**

```ts
import { create } from 'zustand';
import type { Restaurant } from './types';
import type { Sido } from './lib/sido';
import { type FilterState, EMPTY_FILTER, filterRestaurants } from './lib/filter';

interface State {
  restaurants: Restaurant[];
  selectedSido: Sido | null;
  selectedId: string | null;
  hoveredId: string | null;
  filter: FilterState;
  setRestaurants: (r: Restaurant[]) => void;
  selectSido: (s: Sido | null) => void;
  backToNational: () => void;
  selectRestaurant: (id: string | null) => void;
  hoverRestaurant: (id: string | null) => void;
  setFilter: (f: FilterState) => void;
}

export const useStore = create<State>((set) => ({
  restaurants: [],
  selectedSido: null,
  selectedId: null,
  hoveredId: null,
  filter: EMPTY_FILTER,
  setRestaurants: (restaurants) => set({ restaurants }),
  selectSido: (selectedSido) => set({ selectedSido, selectedId: null }),
  backToNational: () => set({ selectedSido: null, selectedId: null, hoveredId: null }),
  selectRestaurant: (selectedId) => set({ selectedId }),
  hoverRestaurant: (hoveredId) => set({ hoveredId }),
  setFilter: (filter) => set({ filter }),
}));

export function countBySido(s: State): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of s.restaurants) out[r.region.sido] = (out[r.region.sido] ?? 0) + 1;
  return out;
}

export function visibleRestaurants(s: State): Restaurant[] {
  if (!s.selectedSido) return [];
  const inSido = s.restaurants.filter((r) => r.region.sido === s.selectedSido);
  return filterRestaurants(inSido, s.filter);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- store`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: zustand store with sido/selection/filter state and selectors"
```

---

### Task 11: 전국 지도 (`components/MapNational.tsx`)

**Files:**
- Create: `src/components/MapNational.tsx`, `src/geo/useGeo.ts`
- Test: `src/components/MapNational.test.tsx`

**Interfaces:**
- Consumes: `useStore`, `countBySido` (Task 10), `createProjection`/`pathFor` (Task 9)
- Produces:
  - `useGeo(url: string)`: `{ data: any | null }` — public/geo JSON fetch 훅
  - `<MapNational />`: 17개 시/도 path 렌더, 각 지역 클릭 시 `selectSido`, `data-testid="sido-{sido}"`, 식당 수 뱃지(`data-testid="badge-{sido}"`)

- [ ] **Step 1: `useGeo` 훅 구현 (테스트에서 fetch 모킹)**

Create `src/geo/useGeo.ts`:

```ts
import { useEffect, useState } from 'react';

export function useGeo<T = any>(url: string): { data: T | null } {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(url).then((r) => r.json()).then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, [url]);
  return { data };
}
```

- [ ] **Step 2: 컴포넌트 테스트 작성**

Create `src/components/MapNational.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MapNational } from './MapNational';
import { useStore } from '../store';
import type { Restaurant } from '../types';

const sidoFC = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { sidoCode: '11', sido: '서울특별시' },
      geometry: { type: 'Polygon', coordinates: [[[126.9,37.4],[127.2,37.4],[127.2,37.7],[126.9,37.7],[126.9,37.4]]] } },
    { type: 'Feature', properties: { sidoCode: '26', sido: '부산광역시' },
      geometry: { type: 'Polygon', coordinates: [[[128.9,35.0],[129.2,35.0],[129.2,35.3],[128.9,35.3],[128.9,35.0]]] } },
  ],
};

const make = (id: string, sido: string): Restaurant => ({
  id, name: '식당', region: { sido, sigungu: '종로구', emd: '관철동' }, address: '',
  coord: { lat: 37.5, lng: 127 }, menus: [], signatureMenu: null, category: '한식',
  episode: { season: 1, no: null, airDate: null }, links: { naver: '', kakao: '' },
  confidence: 'high', sources: [],
});

describe('MapNational', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(sidoFC) })) as any);
    useStore.setState({ restaurants: [make('a', '서울특별시'), make('b', '서울특별시'), make('c', '부산광역시')], selectedSido: null });
  });

  it('renders a clickable region per sido with a count badge', async () => {
    render(<MapNational />);
    const seoul = await screen.findByTestId('sido-서울특별시');
    expect(seoul).toBeInTheDocument();
    expect(screen.getByTestId('badge-서울특별시')).toHaveTextContent('2');
    fireEvent.click(seoul);
    await waitFor(() => expect(useStore.getState().selectedSido).toBe('서울특별시'));
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- MapNational`
Expected: FAIL

- [ ] **Step 4: `MapNational.tsx` 구현**

```tsx
import { useMemo } from 'react';
import { useStore, countBySido } from '../store';
import { useGeo } from '../geo/useGeo';
import { createProjection, pathFor } from '../geo/projection';
import type { Sido } from '../lib/sido';

const W = 500, H = 640;

export function MapNational() {
  const { data } = useGeo('/geo/sido.json');
  const selectSido = useStore((s) => s.selectSido);
  const counts = useStore(countBySido);

  const { path, features } = useMemo(() => {
    if (!data) return { path: null as any, features: [] as any[] };
    const projection = createProjection(data, W, H);
    return { path: pathFor(projection), features: data.features };
  }, [data]);

  if (!data) return <div>지도를 불러오는 중…</div>;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="남한 시도 지도">
      {features.map((f: any) => {
        const sido = f.properties.sido as Sido;
        const d = path(f);
        const [cx, cy] = path.centroid(f);
        const count = counts[sido] ?? 0;
        return (
          <g key={sido}>
            <path
              data-testid={`sido-${sido}`}
              d={d}
              fill={count ? '#ffd8b0' : '#eee'}
              stroke="#b06a2c"
              style={{ cursor: 'pointer' }}
              onClick={() => selectSido(sido)}
            />
            {count > 0 && (
              <text data-testid={`badge-${sido}`} x={cx} y={cy} textAnchor="middle" fontSize={12} pointerEvents="none">
                {count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- MapNational`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: MapNational SVG with per-sido click and count badges"
```

---

### Task 12: 시/도 확대 지도 + 식당 점 (`components/MapProvince.tsx`)

**Files:**
- Create: `src/components/MapProvince.tsx`
- Test: `src/components/MapProvince.test.tsx`

**Interfaces:**
- Consumes: `useStore`, `visibleRestaurants` (Task 10), `createProjection`/`pathFor`/`projectCoord` (Task 9), `useGeo` (Task 11)
- Produces: `<MapProvince />` — 선택 시/도의 시군구·읍면동 경계 + 식당 빨간 점(`data-testid="dot-{id}"`), hover 시 `hoverRestaurant`, 클릭 시 `selectRestaurant`, "전국으로" 버튼(`data-testid="back"`)

- [ ] **Step 1: 테스트 작성**

Create `src/components/MapProvince.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MapProvince } from './MapProvince';
import { useStore } from '../store';
import type { Restaurant } from '../types';

const emdFC = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' },
    geometry: { type: 'Polygon', coordinates: [[[126.9,37.4],[127.2,37.4],[127.2,37.7],[126.9,37.7],[126.9,37.4]]] } },
]};

const make = (id: string, coord: Restaurant['coord']): Restaurant => ({
  id, name: '식당' + id, region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' }, address: '',
  coord, menus: [], signatureMenu: null, category: '한식', episode: { season: 1, no: null, airDate: null },
  links: { naver: '', kakao: '' }, confidence: 'high', sources: [],
});

describe('MapProvince', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(emdFC) })) as any);
    useStore.setState({
      restaurants: [make('a', { lat: 37.55, lng: 127.0 }), make('b', { lat: 37.5, lng: 127.05 }), make('c', null)],
      selectedSido: '서울특별시', selectedId: null, hoveredId: null,
      filter: { category: 'ALL', season: 'ALL', query: '' },
    });
  });

  it('renders one red dot per restaurant that has coords', async () => {
    render(<MapProvince />);
    await screen.findByTestId('dot-a');
    expect(screen.getByTestId('dot-b')).toBeInTheDocument();
    expect(screen.queryByTestId('dot-c')).toBeNull(); // 위치 미확인은 점 없음
  });

  it('selects a restaurant on dot click', async () => {
    render(<MapProvince />);
    fireEvent.click(await screen.findByTestId('dot-a'));
    await waitFor(() => expect(useStore.getState().selectedId).toBe('a'));
  });

  it('goes back to national on back button', async () => {
    render(<MapProvince />);
    fireEvent.click(await screen.findByTestId('back'));
    await waitFor(() => expect(useStore.getState().selectedSido).toBeNull());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- MapProvince`
Expected: FAIL

- [ ] **Step 3: `MapProvince.tsx` 구현**

```tsx
import { useMemo } from 'react';
import { useStore, visibleRestaurants } from '../store';
import { useGeo } from '../geo/useGeo';
import { createProjection, pathFor, projectCoord } from '../geo/projection';

const W = 640, H = 640;

export function MapProvince() {
  const sido = useStore((s) => s.selectedSido);
  const sidoCode = useSidoCode(sido);
  const { data: emd } = useGeo(sidoCode ? `/geo/emd/${sidoCode}.json` : '');
  const restaurants = useStore(visibleRestaurants);
  const selectRestaurant = useStore((s) => s.selectRestaurant);
  const hoverRestaurant = useStore((s) => s.hoverRestaurant);
  const backToNational = useStore((s) => s.backToNational);
  const hoveredId = useStore((s) => s.hoveredId);

  const { path, projection, features } = useMemo(() => {
    if (!emd) return { path: null as any, projection: null as any, features: [] as any[] };
    const p = createProjection(emd, W, H);
    return { path: pathFor(p), projection: p, features: emd.features };
  }, [emd]);

  return (
    <div>
      <button data-testid="back" onClick={backToNational}>◀ 전국으로</button>
      <h2>{sido}</h2>
      {!emd ? <div>지도를 불러오는 중…</div> : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${sido} 지도`}>
          {features.map((f: any, i: number) => (
            <path key={i} d={path(f)} fill="#f7f0e8" stroke="#d0b48a" strokeWidth={0.5} />
          ))}
          {restaurants.map((r) => {
            if (!r.coord) return null;
            const xy = projectCoord(projection, r.coord);
            if (!xy) return null;
            const active = r.id === hoveredId;
            return (
              <circle
                key={r.id}
                data-testid={`dot-${r.id}`}
                cx={xy[0]} cy={xy[1]} r={active ? 7 : 5}
                fill="#e53935" stroke="#fff" strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => hoverRestaurant(r.id)}
                onMouseLeave={() => hoverRestaurant(null)}
                onClick={() => selectRestaurant(r.id)}
              >
                <title>{r.name}</title>
              </circle>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// sido 이름 -> sidoCode 조회 (sido-index.json)
import { useGeo as _useGeo } from '../geo/useGeo';
function useSidoCode(sido: string | null): string | null {
  const { data } = _useGeo<Array<{ sidoCode: string; sido: string }>>('/geo/sido-index.json');
  if (!sido || !data) return null;
  return data.find((d) => d.sido === sido)?.sidoCode ?? null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- MapProvince`
Expected: PASS (테스트의 fetch 모킹은 모든 URL에 대해 `emdFC`를 반환하므로 sido-index 조회도 통과하도록, 필요 시 테스트에서 `useSidoCode`를 우회하는 대신 fetch 모킹이 배열/FC 둘 다 커버하도록 조정)

> 주의: 위 테스트의 단순 fetch 모킹은 `sido-index.json`도 `emdFC`(배열 아님)를 반환한다. `useSidoCode`가 배열이 아닐 때 `null`을 반환하면 emd fetch가 빈 URL이 된다. 이를 피하기 위해 테스트에서는 URL별로 응답을 분기하도록 모킹을 작성한다:

```tsx
vi.stubGlobal('fetch', vi.fn((url: string) =>
  Promise.resolve({ json: () => Promise.resolve(
    url.includes('sido-index') ? [{ sidoCode: '11', sido: '서울특별시' }] : emdFC,
  ) })) as any);
```

Step 1의 `beforeEach` fetch 모킹을 위 분기 버전으로 교체한 뒤 재실행.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: MapProvince with emd boundaries and red restaurant dots"
```

---

### Task 13: 식당 리스트 · 상세 카드 (`components/RestaurantPanel.tsx`, `RestaurantCard.tsx`)

**Files:**
- Create: `src/components/RestaurantPanel.tsx`, `src/components/RestaurantCard.tsx`
- Test: `src/components/RestaurantCard.test.tsx`, `src/components/RestaurantPanel.test.tsx`

**Interfaces:**
- Consumes: `useStore`, `visibleRestaurants` (Task 10), `categoryIcon` (Task 2)
- Produces:
  - `<RestaurantCard restaurant={r} />` — 카테고리 아이콘/플레이스홀더, 이름, 대표메뉴, 메뉴 목록, 주소, 네이버/카카오 링크, "사진 보기"(네이버 링크로 열기), 기수/회차
  - `<RestaurantPanel />` — `visibleRestaurants` 리스트, hover ↔ 점 하이라이트, 클릭 시 상세 확장/선택

- [ ] **Step 1: 카드 테스트 작성**

Create `src/components/RestaurantCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RestaurantCard } from './RestaurantCard';
import type { Restaurant } from '../types';

const r: Restaurant = {
  id: 'a', name: '그림집', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' },
  address: '서울특별시 종로구 관철동 12-3', coord: { lat: 37.5, lng: 127 },
  menus: ['물회', '매운탕'], signatureMenu: '물회', category: '해산물',
  episode: { season: 12, no: 145, airDate: '2023-05-06' },
  links: { naver: 'https://map.naver.com/v5/search/그림집', kakao: 'https://map.kakao.com/link/search/그림집' },
  confidence: 'high', sources: [],
};

describe('RestaurantCard', () => {
  it('shows name, address, menus, episode and outbound links', () => {
    render(<RestaurantCard restaurant={r} />);
    expect(screen.getByText('그림집')).toBeInTheDocument();
    expect(screen.getByText(/관철동 12-3/)).toBeInTheDocument();
    expect(screen.getByText(/물회/)).toBeInTheDocument();
    expect(screen.getByText(/12기/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /네이버/ })).toHaveAttribute('href', r.links.naver);
    expect(screen.getByRole('link', { name: /카카오/ })).toHaveAttribute('href', r.links.kakao);
    expect(screen.getByRole('link', { name: /사진 보기/ })).toHaveAttribute('href', r.links.naver);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- RestaurantCard`
Expected: FAIL

- [ ] **Step 3: `RestaurantCard.tsx` 구현**

```tsx
import type { Restaurant } from '../types';
import { categoryIcon } from '../lib/categories';

export function RestaurantCard({ restaurant: r }: { restaurant: Restaurant }) {
  return (
    <article className="card">
      <div className="card-thumb" aria-hidden>{categoryIcon(r.category)}</div>
      <h3>{r.name}</h3>
      {r.signatureMenu && <p className="sig">🍽️ 대표메뉴: {r.signatureMenu}</p>}
      {r.menus.length > 0 && <p className="menus">메뉴: {r.menus.join(', ')}</p>}
      <p className="addr">📍 {r.address}</p>
      <p className="epi">백반기행 {r.episode.season}기{r.episode.no ? ` · ${r.episode.no}회` : ''}{r.episode.airDate ? ` · ${r.episode.airDate}` : ''}</p>
      {r.coord === null && <p className="warn">위치 미확인</p>}
      <div className="links">
        <a href={r.links.naver} target="_blank" rel="noreferrer">네이버 지도</a>
        <a href={r.links.kakao} target="_blank" rel="noreferrer">카카오맵</a>
        <a href={r.links.naver} target="_blank" rel="noreferrer">사진 보기</a>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: 카드 테스트 통과 확인**

Run: `npm test -- RestaurantCard`
Expected: PASS

- [ ] **Step 5: 패널 테스트 작성**

Create `src/components/RestaurantPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RestaurantPanel } from './RestaurantPanel';
import { useStore } from '../store';
import type { Restaurant } from '../types';

const make = (id: string, name: string): Restaurant => ({
  id, name, region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' }, address: '주소',
  coord: { lat: 37.5, lng: 127 }, menus: [], signatureMenu: null, category: '한식',
  episode: { season: 1, no: null, airDate: null }, links: { naver: 'n', kakao: 'k' },
  confidence: 'high', sources: [],
});

describe('RestaurantPanel', () => {
  beforeEach(() => {
    useStore.setState({
      restaurants: [make('a', '가게A'), make('b', '가게B')], selectedSido: '서울특별시',
      selectedId: null, hoveredId: null, filter: { category: 'ALL', season: 'ALL', query: '' },
    });
  });

  it('lists visible restaurants of the selected sido', () => {
    render(<RestaurantPanel />);
    expect(screen.getByText('가게A')).toBeInTheDocument();
    expect(screen.getByText('가게B')).toBeInTheDocument();
  });

  it('shows an empty message when no sido selected', () => {
    useStore.setState({ selectedSido: null });
    render(<RestaurantPanel />);
    expect(screen.getByText(/지도에서 지역/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: `RestaurantPanel.tsx` 구현**

```tsx
import { useStore, visibleRestaurants } from '../store';
import { RestaurantCard } from './RestaurantCard';

export function RestaurantPanel() {
  const sido = useStore((s) => s.selectedSido);
  const list = useStore(visibleRestaurants);
  const hoverRestaurant = useStore((s) => s.hoverRestaurant);
  const selectRestaurant = useStore((s) => s.selectRestaurant);
  const hoveredId = useStore((s) => s.hoveredId);

  if (!sido) return <p className="empty">지도에서 지역을 선택하세요.</p>;
  if (list.length === 0) return <p className="empty">조건에 맞는 식당이 없습니다.</p>;

  return (
    <div className="panel">
      {list.map((r) => (
        <div
          key={r.id}
          className={r.id === hoveredId ? 'row hovered' : 'row'}
          onMouseEnter={() => hoverRestaurant(r.id)}
          onMouseLeave={() => hoverRestaurant(null)}
          onClick={() => selectRestaurant(r.id)}
        >
          <RestaurantCard restaurant={r} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: 패널 테스트 통과 확인**

Run: `npm test -- RestaurantPanel`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: restaurant panel and detail card with outbound links"
```

---

### Task 14: 필터/검색 UI (`components/Filters.tsx`)

**Files:**
- Create: `src/components/Filters.tsx`
- Test: `src/components/Filters.test.tsx`

**Interfaces:**
- Consumes: `useStore` (Task 10), `CATEGORIES` (Task 2)
- Produces: `<Filters />` — 카테고리 select(`data-testid="filter-category"`), 기수 select(`data-testid="filter-season"`), 검색 input(`data-testid="filter-query"`); 변경 시 `setFilter`

- [ ] **Step 1: 테스트 작성**

Create `src/components/Filters.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Filters } from './Filters';
import { useStore } from '../store';
import type { Restaurant } from '../types';

const make = (id: string, season: number): Restaurant => ({
  id, name: 'n', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' }, address: '',
  coord: null, menus: [], signatureMenu: null, category: '한식',
  episode: { season, no: null, airDate: null }, links: { naver: '', kakao: '' }, confidence: 'high', sources: [],
});

describe('Filters', () => {
  beforeEach(() => {
    useStore.setState({ restaurants: [make('a', 1), make('b', 3)], filter: { category: 'ALL', season: 'ALL', query: '' } });
  });

  it('updates query filter on input', () => {
    render(<Filters />);
    fireEvent.change(screen.getByTestId('filter-query'), { target: { value: '국밥' } });
    expect(useStore.getState().filter.query).toBe('국밥');
  });

  it('updates category filter on select', () => {
    render(<Filters />);
    fireEvent.change(screen.getByTestId('filter-category'), { target: { value: '해산물' } });
    expect(useStore.getState().filter.category).toBe('해산물');
  });

  it('lists available seasons from data', () => {
    render(<Filters />);
    const opts = Array.from(screen.getByTestId('filter-season').querySelectorAll('option')).map((o) => o.textContent);
    expect(opts).toContain('1기');
    expect(opts).toContain('3기');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- Filters`
Expected: FAIL

- [ ] **Step 3: `Filters.tsx` 구현**

```tsx
import { useMemo } from 'react';
import { useStore } from '../store';
import { CATEGORIES } from '../lib/categories';

export function Filters() {
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const restaurants = useStore((s) => s.restaurants);

  const seasons = useMemo(
    () => [...new Set(restaurants.map((r) => r.episode.season))].sort((a, b) => a - b),
    [restaurants],
  );

  return (
    <div className="filters">
      <input
        data-testid="filter-query"
        placeholder="식당·메뉴 검색"
        value={filter.query}
        onChange={(e) => setFilter({ ...filter, query: e.target.value })}
      />
      <select
        data-testid="filter-category"
        value={filter.category}
        onChange={(e) => setFilter({ ...filter, category: e.target.value as any })}
      >
        <option value="ALL">전체 카테고리</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select
        data-testid="filter-season"
        value={String(filter.season)}
        onChange={(e) => setFilter({ ...filter, season: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) })}
      >
        <option value="ALL">전체 기수</option>
        {seasons.map((s) => <option key={s} value={s}>{s}기</option>)}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- Filters`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: category/season/query filter controls"
```

---

### Task 15: 앱 조립 + 데이터 로딩 (`App.tsx`, `main.tsx`, 스타일)

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Create: `src/App.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: 모든 컴포넌트 + `useStore.setRestaurants`, `restaurants.json`
- Produces: 완성된 화면 — 좌: 지도(전국↔시/도 토글), 우: 필터 + 식당 패널

- [ ] **Step 1: 앱 통합 테스트 작성**

Create `src/App.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { useStore } from './store';
import type { Restaurant } from './types';

const sidoFC = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { sidoCode: '11', sido: '서울특별시' },
    geometry: { type: 'Polygon', coordinates: [[[126.9,37.4],[127.2,37.4],[127.2,37.7],[126.9,37.7],[126.9,37.4]]] } },
]};
const emdFC = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' },
    geometry: { type: 'Polygon', coordinates: [[[126.9,37.4],[127.2,37.4],[127.2,37.7],[126.9,37.7],[126.9,37.4]]] } },
]};
const r: Restaurant = {
  id: 'a', name: '그림집', region: { sido: '서울특별시', sigungu: '종로구', emd: '관철동' }, address: '주소',
  coord: { lat: 37.55, lng: 127.0 }, menus: ['물회'], signatureMenu: '물회', category: '해산물',
  episode: { season: 12, no: 145, airDate: '2023-05-06' }, links: { naver: 'n', kakao: 'k' }, confidence: 'high', sources: [],
};

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve({ json: () => Promise.resolve(
      url.includes('restaurants') ? [r]
        : url.includes('sido-index') ? [{ sidoCode: '11', sido: '서울특별시' }]
        : url.includes('/emd/') ? emdFC
        : sidoFC,
    ) })) as any);
    useStore.setState({ restaurants: [], selectedSido: null, selectedId: null });
  });

  it('drills from national to province and shows the restaurant', async () => {
    render(<App />);
    const seoul = await screen.findByTestId('sido-서울특별시');
    fireEvent.click(seoul);
    await waitFor(() => expect(screen.getByText('그림집')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- App`
Expected: FAIL

- [ ] **Step 3: `App.tsx` 구현**

```tsx
import { useEffect } from 'react';
import { useStore } from './store';
import { useGeo } from './geo/useGeo';
import { MapNational } from './components/MapNational';
import { MapProvince } from './components/MapProvince';
import { RestaurantPanel } from './components/RestaurantPanel';
import { Filters } from './components/Filters';
import type { Restaurant } from './types';
import './App.css';

export function App() {
  const selectedSido = useStore((s) => s.selectedSido);
  const setRestaurants = useStore((s) => s.setRestaurants);
  const { data } = useGeo<Restaurant[]>('/data/restaurants.json');

  useEffect(() => { if (data) setRestaurants(data); }, [data, setRestaurants]);

  return (
    <div className="app">
      <header><h1>허영만 백반기행 맛집 지도</h1></header>
      <div className="layout">
        <section className="map">
          {selectedSido ? <MapProvince /> : <MapNational />}
        </section>
        <aside className="side">
          <Filters />
          <RestaurantPanel />
        </aside>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: `restaurants.json`을 앱에서 로드 가능하게 배치**

`src/data/restaurants.json`(Task 8 산출)을 앱이 `/data/restaurants.json`으로 fetch하도록 `public/data/`로 복사하는 단계를 빌드에 추가. `package.json` scripts의 `assign:coords`의 out 경로를 `public/data/restaurants.json`으로 바꾸거나, 복사 스크립트 추가:

```json
"prebuild": "npm run build:geo && npm run assign:coords && npm run validate:data"
```

그리고 `assign:coords`의 out을 `public/data/restaurants.json`으로 조정한다. `public/data/` 디렉토리를 만들고 커밋한다.

- [ ] **Step 5: `main.tsx` 정리 및 `App.css` 최소 스타일 작성**

`src/main.tsx`가 `App`을 렌더하도록 확인. `src/App.css`에 2단 레이아웃 최소 스타일:

```css
.app { font-family: system-ui, sans-serif; }
.layout { display: flex; gap: 16px; padding: 16px; }
.map { flex: 0 0 auto; }
.side { flex: 1 1 auto; max-height: 90vh; overflow: auto; }
.filters { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.card { border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.card-thumb { font-size: 32px; }
.row.hovered .card { outline: 2px solid #e53935; }
.links a { margin-right: 8px; }
.warn { color: #b26a00; font-size: 12px; }
.empty { color: #888; padding: 24px; }
```

- [ ] **Step 6: 앱 테스트 통과 확인**

Run: `npm test -- App`
Expected: PASS

- [ ] **Step 7: 전체 테스트 + 빌드 확인**

Run: `npm test && npm run build`
Expected: 모든 테스트 PASS, 빌드 성공

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: assemble app layout with data loading and national/province toggle"
```

---

### Task 16: 데이터 검증 스크립트 + E2E 스모크

**Files:**
- Create: `scripts/validate-data.ts`, `e2e/smoke.spec.ts`
- Test: (E2E 자체가 테스트)

**Interfaces:**
- Consumes: `restaurants.json`, `CATEGORIES` (Task 2), 실행 중인 dev 서버
- Produces: `validate-data.ts` CLI (스키마·bbox 검증, 위반 시 exit 1); Playwright 스모크

- [ ] **Step 1: `validate-data.ts` 구현**

```ts
import { readFileSync } from 'node:fs';
import type { Restaurant } from '../src/types';
import { CATEGORIES } from '../src/lib/categories';

const path = process.argv[2] ?? 'public/data/restaurants.json';
const list = JSON.parse(readFileSync(path, 'utf8')) as Restaurant[];
const errors: string[] = [];

const ids = new Set<string>();
for (const r of list) {
  if (!r.id || ids.has(r.id)) errors.push(`bad/duplicate id: ${r.id}`);
  ids.add(r.id);
  if (!r.name) errors.push(`${r.id}: missing name`);
  if (!CATEGORIES.includes(r.category)) errors.push(`${r.id}: bad category ${r.category}`);
  if (!r.links.naver.includes('map.naver.com')) errors.push(`${r.id}: bad naver link`);
  if (r.coord) {
    const { lat, lng } = r.coord;
    if (lat < 33 || lat > 39.5 || lng < 124 || lng > 132) errors.push(`${r.id}: coord out of Korea bbox`);
  }
}

if (errors.length) {
  console.error('validate-data FAILED:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`validate-data OK: ${list.length} records`);
```

- [ ] **Step 2: 검증 스크립트 실행 확인**

Run: `npm run validate:data` (경로 인자를 `public/data/restaurants.json`으로)
Expected: `validate-data OK: N records`

- [ ] **Step 3: E2E 스모크 작성**

Create `e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('전국 → 시/도 → 점 → 카드', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /백반기행/ })).toBeVisible();

  // 식당이 있는 첫 시/도 클릭 (뱃지가 있는 지역)
  const badge = page.locator('[data-testid^="badge-"]').first();
  await expect(badge).toBeVisible();
  const sido = (await badge.getAttribute('data-testid'))!.replace('badge-', '');
  await page.locator(`[data-testid="sido-${sido}"]`).click();

  // 시/도 화면 진입
  await expect(page.getByTestId('back')).toBeVisible();

  // 첫 빨간 점 클릭 → 상세 표시 (패널에 최소 하나의 카드)
  const dot = page.locator('[data-testid^="dot-"]').first();
  await expect(dot).toBeVisible();
  await dot.click();
  await expect(page.locator('.card').first()).toBeVisible();
});
```

- [ ] **Step 4: E2E 실행 확인**

Run: `npm run build:geo && npm run assign:coords && npm run e2e`
Expected: 스모크 PASS (시드 데이터 기준)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: data validation script and end-to-end smoke"
```

---

## Self-Review

**1. Spec coverage**
- 식당 정보/대표음식/주소/메뉴 → Task 2(스키마), Task 13(카드) ✅
- 네이버/카카오 링크 → Task 5, Task 8 ✅
- 이미지 링크 연결 방식 → Task 13(카테고리 아이콘 + "사진 보기" 링크) ✅
- SVG 지도 + 카드 리스트 → Task 11, 12, 13 ✅
- 2단계 드릴다운(전국→시/도, 구/동 구획 + 빨간 점) → Task 11, 12 ✅
- 동 중심점 근사 좌표(키 불필요) → Task 7, 8 ✅
- 필터/검색 → Task 6, 14 ✅
- 위치 미확인/누락 graceful 처리 → Task 8(null), Task 12(점 생략), Task 13(경고) ✅
- 테스트(파이프라인 단위 + 프론트 컴포넌트 + Playwright 스모크) → 전 Task + Task 16 ✅
- **데이터 전체 자동수집** → **본 플랜 범위 밖(Plan 2)**. 본 플랜은 시드로 앱을 완성. (아래 Plan 2 참고)

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. 유일한 외부 의존(경계 데이터 원본 properties 키)은 Task 7 Step 1에서 확인·조정하도록 명시(플레이스홀더 아님, 검증 절차).

**3. Type consistency:** `Restaurant`/`Coord`/`Category`/`Sido`/`FilterState`/`CentroidRow`/`ParsedAddress` 시그니처가 정의 Task와 소비 Task에서 일치. `matchCentroid`, `jitter`, `buildMapLinks`, `parseAddress`, `canonicalSido`, `createProjection`/`projectCoord`, `visibleRestaurants`/`countBySido` 명칭 전 Task 일관.

---

## Plan 2 예고 (별도 문서로 작성 예정)

전체 자동 수집: `Workflow`로 시즌/지역 팬아웃 웹 리서치 → 교차검증 → `Restaurant[]` 정규화(동일 스키마) → `assign-coords`/`validate-data` 재사용 → `public/data/restaurants.json` 갱신. 본 플랜의 파이프라인·검증·UI를 그대로 재사용하므로 데이터만 교체된다.
