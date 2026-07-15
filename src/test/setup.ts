import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// 각 테스트 후 URL을 초기화(내비게이션이 pushState로 바꾼 ?r=... 가 다음 테스트로 누수되지 않게)
afterEach(() => {
  window.history.replaceState(null, '', '/');
});
