// GitHub Pages(project pages)에서 base 경로가 '/repo/'가 되므로,
// 정적 자산은 import.meta.env.BASE_URL 기준으로 참조한다.
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}
