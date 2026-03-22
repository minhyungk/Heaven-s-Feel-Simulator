import type { Servant } from "../data/types";
import { statRankToScore } from "../data/types";
import type { SkillPrefixes } from "./types";
import { findClassSkillRank } from "./combat";
import {
  ESCAPE_BASE,
  RIDING_ESCAPE_BONUS,
  CONCEALMENT_ESCAPE_BONUS,
} from "./config";

/** 도주 성공 확률 계산 */
export function calcEscapeChance(
  servant: Servant,
  pursuer: Servant,
  prefixes: SkillPrefixes,
): number {
  let chance = ESCAPE_BASE;

  // 민첩 보정
  const myAgility = statRankToScore(servant.stats.agility) ?? 5;
  const enemyAgility = statRankToScore(pursuer.stats.agility) ?? 5;
  chance += (myAgility - enemyAgility) * 0.03;

  // 행운 보정
  const myLuck = statRankToScore(servant.stats.luck) ?? 5;
  const enemyLuck = statRankToScore(pursuer.stats.luck) ?? 5;
  chance += (myLuck - enemyLuck) * 0.02;

  // 기승 보너스 (+15%)
  const riding = findClassSkillRank(servant, prefixes.riding);
  if (riding) {
    chance += RIDING_ESCAPE_BONUS;
  }

  // 기척차단 보너스 (+10%)
  const concealment = findClassSkillRank(servant, prefixes.presenceConcealment);
  if (concealment) {
    chance += CONCEALMENT_ESCAPE_BONUS;
  }

  // 추적자 기척감지 보정
  const detection = findClassSkillRank(pursuer, prefixes.presenceDetection);
  if (detection) {
    chance -= detection.score * 0.03;
  }

  return Math.min(Math.max(chance, 0.05), 0.95);
}

/** 도주 판정 실행 */
export function attemptEscape(
  servant: Servant,
  pursuer: Servant,
  prefixes: SkillPrefixes,
  commandSealEscape: boolean = false,
): { success: boolean; chance: number } {
  if (commandSealEscape) return { success: true, chance: 1.0 };

  const chance = calcEscapeChance(servant, pursuer, prefixes);
  return { success: Math.random() < chance, chance };
}
