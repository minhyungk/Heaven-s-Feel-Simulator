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
  //여름
  128, 129, 130, 131, 132, 133, 134, 135, 175, 176, 177, 178, 179, 
  180, 181, 182, 216, 217, 218, 219, 220, 221, 222, 261, 262, 263, 
  264, 265, 266, 267, 285, 286, 287, 288, 289, 290, 291, 318, 319, 
  320, 321, 323, 354, 355, 356, 357, 358, 386, 387, 388, 390, 391, 392,
  //산타
  73, 141, 271, 301, 330, 401
]);

const allServants: Servant[] = data as Servant[];

const servants: Servant[] = allServants.filter((s) => {
  if (SUMMER_EVENT_IDS.has(s.id)) return false;
  return !EXCLUDE_PATTERNS.some((p) => p.test(s.name));
});

export default servants;
