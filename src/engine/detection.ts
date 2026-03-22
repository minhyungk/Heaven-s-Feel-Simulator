import type { Servant } from "../data/types";
import type { Intent, SkillPrefixes } from "./types";
import { findClassSkillRank } from "./combat";
import {
  DETECTION_BASE_GUARD, DETECTION_BASE_HUNT,
  ASSASSIN_STEALTH_BONUS,
  LATE_GAME_DETECTION_BONUS, LATE_GAME_DETECTION_FALLBACK,
} from "./config";
import { getAreaStealthBonus } from "./map";
import type { TileId } from "./types";

/** 후반 보정 계산 */
function getLateGameBonus(day: number): number {
  for (const [maxDay, bonus] of LATE_GAME_DETECTION_BONUS) {
    if (day <= maxDay) return bonus;
  }
  return LATE_GAME_DETECTION_FALLBACK;
}

/**
 * 은신 발각 확률 계산
 * 발각 확률 = 기본률(경계25%/사냥10%) + 기척감지 - 기척차단 - Assassin보너스(-10%) + 후반보정 + 지역효과
 */
export function calcDetectionChance(
  hider: Servant,
  seeker: Servant,
  seekerIntent: Intent,
  day: number,
  tileId: TileId,
  prefixes: SkillPrefixes,
): number {
  // 기본률
  let chance = seekerIntent === "guard" ? DETECTION_BASE_GUARD : DETECTION_BASE_HUNT;

  // 기척감지 보너스
  const detection = findClassSkillRank(seeker, prefixes.presenceDetection);
  if (detection) {
    chance += detection.score * 0.04;
  }

  // 기척차단 감소
  const concealment = findClassSkillRank(hider, prefixes.presenceConcealment);
  if (concealment) {
    chance -= concealment.score * 0.04;
  }

  // Assassin 클래스 은신 보너스
  if (hider.class === "Assassin") {
    chance -= ASSASSIN_STEALTH_BONUS;
  }

  // 후반 보정
  chance += getLateGameBonus(day);

  // 지역 효과
  chance -= getAreaStealthBonus(tileId);

  return Math.min(Math.max(chance, 0.02), 0.90);
}

/** 은신 발각 판정 */
export function checkDetection(
  hider: Servant,
  seeker: Servant,
  seekerIntent: Intent,
  day: number,
  tileId: TileId,
  prefixes: SkillPrefixes,
): { detected: boolean; chance: number } {
  const chance = calcDetectionChance(hider, seeker, seekerIntent, day, tileId, prefixes);
  return { detected: Math.random() < chance, chance };
}
