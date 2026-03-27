import { josa as tossJosa } from "@toss/hangul";

/**
 * @toss/hangul 래퍼 — 한국어 조사 자동 선택
 * @example josa('아서', '이/가') → '아서가'
 * @example josa('호겐', '이/가') → '호겐이'
 */
export function josa(
  word: string,
  josaType: "이/가" | "은/는" | "을/를" | "와/과" | "으로/로" | "아/야" | "이랑/랑",
): string {
  return tossJosa(word, josaType);
}

/**
 * 텍스트 내의 이중 조사 표기를 자동으로 올바른 조사로 변환
 *
 * 두 가지 표기법 모두 지원:
 *   - "아서이(가) 패배했다" → "아서가 패배했다"   (받침없는+이(가))
 *   - "아서(이)가 패배했다" → "아서가 패배했다"   ((이)가)
 *   - "호겐은(는) 승리했다" → "호겐은 승리했다"   (받침있는+은(는))
 *   - "호겐(은)는 승리했다" → "호겐은 승리했다"   ((은)는)
 */
export function fixParticles(text: string): string {
  if (!text) return text;
  return text
    // 이/가 — 두 표기법: "XX이(가)" 또는 "XX(이)가"
    .replace(/([가-힣]+)이\(가\)/g, (_, word) => tossJosa(word, "이/가"))
    .replace(/([가-힣]+)\(이\)가/g, (_, word) => tossJosa(word, "이/가"))
    // 은/는
    .replace(/([가-힣]+)은\(는\)/g, (_, word) => tossJosa(word, "은/는"))
    .replace(/([가-힣]+)\(은\)는/g, (_, word) => tossJosa(word, "은/는"))
    // 을/를
    .replace(/([가-힣]+)을\(를\)/g, (_, word) => tossJosa(word, "을/를"))
    .replace(/([가-힣]+)\(을\)를/g, (_, word) => tossJosa(word, "을/를"))
    // 와/과
    .replace(/([가-힣]+)(?:와\(과\)|\(와\)과|과\(와\)|\(과\)와)/g, (_, word) => tossJosa(word, "와/과"))
    // 으로/로
    .replace(/([가-힣]+)(?:으\(로\)|\(으\)로)/g, (_, word) => tossJosa(word, "으로/로"))
    // 아/야
    .replace(/([가-힣]+)(?:이야\(야\)|\(이야\)야|아\(야\)|\(아\)야)/g, (_, word) => tossJosa(word, "아/야"))
    // 이랑/랑
    .replace(/([가-힣]+)(?:이랑\(랑\)|\(이랑\)랑)/g, (_, word) => tossJosa(word, "이랑/랑"));
}
