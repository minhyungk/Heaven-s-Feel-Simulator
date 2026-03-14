import type { Servant } from "./types";
import data from "./servants.json";

// 서머/이벤트 변형 서번트 제외 패턴
const EXCLUDE_PATTERNS = [
  /\(할로윈\)/, /\(브레이브\)/, /\(신데렐라\)/,
  /\(삼바\/산타\)/, /\[산타\]/, /산타 얼터/, /산타 릴리/,
  /메카에리/, /서머베케/,
  // 여름 변형: 클래스가 바뀐 수영복 서번트들 (이름에 (수영복) 또는 summer 표시 없이 클래스만 다른 경우)
  // Atlas Academy에서는 여름 서번트가 별도 collectionNo로 등록되어 있으므로
  // 같은 이름이 다른 클래스로 중복 등록된 경우를 필터
];

// 여름/이벤트 한정 서번트의 collectionNo 목록
const SUMMER_EVENT_IDS = new Set([
  // 산타/할로윈/이벤트
  61, 73, 128, 129, 130, 131, 132, 133, 139, 170, 171, 172, 173, 174, 175, 176,
  177, 185, 186, 192, 228, 265, 295, 310, 311, 312, 313, 314, 315, 316, 323, 330,
  344, 345, 346, 347, 348, 349, 350, 351, 374, 375, 376, 377, 378, 387,
  // 여름 이벤트 서번트 (수영복)
  117, 118, 119, 120, 126, 127, 134, 135, 136, 211, 212, 213, 214, 215, 216, 217,
  256, 257, 258, 259, 260, 261, 262, 263, 264, 281, 282, 283, 284, 285,
]);

const allServants: Servant[] = data as Servant[];

const servants: Servant[] = allServants.filter((s) => {
  if (SUMMER_EVENT_IDS.has(s.id)) return false;
  return !EXCLUDE_PATTERNS.some((p) => p.test(s.name));
});

export default servants;
