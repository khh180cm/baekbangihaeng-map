import { useStore } from './store';
import { canonicalSido, type Sido } from './lib/sido';

// in-app 내비게이션을 브라우저 히스토리 + URL과 동기화한다.
// - 전국→시/도→식당 이동마다 history 항목을 쌓아 뒤로가기가 이전 화면으로 복귀
// - 현재 지역을 URL(?r=시도&id=)에 반영 → 사진·후기/카카오맵 등 외부 링크를
//   같은 탭에서 열고 뒤로가기로 돌아와도(새로고침되어 bfcache가 없어도) 복원

interface View { sido: Sido | null; id: string | null }

let fromPop = false;

function currentView(): View {
  const s = useStore.getState();
  return { sido: s.selectedSido, id: s.selectedId };
}

function urlFor(v: View): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams();
  if (v.sido) params.set('r', v.sido);
  if (v.sido && v.id) params.set('id', v.id);
  const qs = params.toString();
  return window.location.pathname + (qs ? `?${qs}` : '');
}

function parseUrlView(): View {
  if (typeof window === 'undefined') return { sido: null, id: null };
  const p = new URLSearchParams(window.location.search);
  const sido = canonicalSido(p.get('r') ?? '');
  return { sido: sido ?? null, id: sido ? p.get('id') : null };
}

function commit(mode: 'push' | 'replace') {
  if (fromPop || typeof window === 'undefined') return;
  const v = currentView();
  const state = { view: v };
  const url = urlFor(v);
  if (mode === 'replace') window.history.replaceState(state, '', url);
  else window.history.pushState(state, '', url);
}

export const nav = {
  /** 전국 → 시/도 (히스토리 push) */
  toProvince(sido: Sido) {
    useStore.getState().selectSido(sido);
    commit('push');
  },
  /** 식당 선택. 처음 선택은 push, 다른 식당으로 전환은 replace(스택 누적 방지) */
  openRestaurant(id: string) {
    const had = useStore.getState().selectedId;
    useStore.getState().selectRestaurant(id);
    commit(had ? 'replace' : 'push');
  },
  /** 검색 결과 클릭 → 해당 지역+식당으로 이동(검색 종료), 히스토리 push */
  openResult(sido: Sido, id: string) {
    useStore.getState().setView(sido, id, '');
    commit('push');
  },
  /** 뒤로가기(버튼) = 브라우저 back과 동일 동작 */
  back() {
    if (typeof window !== 'undefined') window.history.back();
  },
};

/** App 마운트 시 1회 호출. URL의 지역을 복원하고 popstate를 처리한다. */
export function initHistory(): () => void {
  if (typeof window === 'undefined') return () => {};
  // 딥링크/새로고침/뒤로가기(비-bfcache) 시 URL의 지역을 복원
  const initial = parseUrlView();
  if (initial.sido) useStore.getState().setView(initial.sido, initial.id);
  window.history.replaceState({ view: currentView() }, '', urlFor(currentView()));

  const onPop = (e: PopStateEvent) => {
    fromPop = true;
    const v: View = (e.state && e.state.view) || parseUrlView();
    useStore.getState().setView(v.sido, v.id);
    fromPop = false;
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}
