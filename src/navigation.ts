import { useStore } from './store';
import type { Sido } from './lib/sido';

// in-app 내비게이션을 브라우저 히스토리와 동기화한다.
// 전국→시/도→식당 이동마다 history 항목을 쌓아, 뒤로가기/엣지 스와이프가
// 페이지를 종료하지 않고 이전 화면으로 돌아가게 한다.

interface View { sido: Sido | null; id: string | null }

let fromPop = false;

function currentView(): View {
  const s = useStore.getState();
  return { sido: s.selectedSido, id: s.selectedId };
}

function commit(mode: 'push' | 'replace') {
  if (fromPop || typeof window === 'undefined') return;
  const state = { view: currentView() };
  if (mode === 'replace') window.history.replaceState(state, '');
  else window.history.pushState(state, '');
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

/** App 마운트 시 1회 호출. 초기 상태를 replaceState로 심고 popstate를 처리한다. */
export function initHistory(): () => void {
  if (typeof window === 'undefined') return () => {};
  window.history.replaceState({ view: currentView() }, '');
  const onPop = (e: PopStateEvent) => {
    fromPop = true;
    const v: View = (e.state && e.state.view) || { sido: null, id: null };
    useStore.getState().setView(v.sido, v.id);
    fromPop = false;
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}
