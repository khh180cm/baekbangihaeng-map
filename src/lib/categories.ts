export const CATEGORIES = [
  '한식', '해산물', '고기', '면', '분식',
  '중식', '일식', '양식', '카페·디저트', '기타',
] as const;

export type Category = (typeof CATEGORIES)[number];

const ICONS: Record<Category, string> = {
  '한식': '🍚',
  '해산물': '🦐',
  '고기': '🥩',
  '면': '🍜',
  '분식': '🍢',
  '중식': '🥟',
  '일식': '🍣',
  '양식': '🍝',
  '카페·디저트': '☕',
  '기타': '🍽️',
};

export function categoryIcon(c: Category): string {
  return ICONS[c] ?? ICONS['기타'];
}
