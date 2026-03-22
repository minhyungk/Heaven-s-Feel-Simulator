import type { Servant } from "../data/types";
import type { Intent, SkillPrefixes } from "./types";
import { findClassSkillRank } from "./combat";
import { MAD_DISOBEY_CHANCES } from "./config";

export interface MadEnhancementResult {
  disobeyed: boolean;
  originalIntent: Intent;
  overriddenIntent: Intent;
  rank: string;
}

/** 광화 랭크에 따른 명령 무시 확률 조회 */
function getDisobeyChance(rank: string): number {
  // 정확한 매칭 먼저
  if (MAD_DISOBEY_CHANCES[rank] !== undefined) return MAD_DISOBEY_CHANCES[rank];
  // "EX(C 상당)" 같은 케이스 → EX로 처리
  if (rank.startsWith("EX")) return MAD_DISOBEY_CHANCES["EX"] ?? 0.60;
  return 0;
}

/** 광화 시스템: 명령 무시 판정 */
export function checkMadEnhancement(
  servant: Servant,
  chosenIntent: Intent,
  prefixes: SkillPrefixes,
  commandSealOverride: boolean = false,
): MadEnhancementResult {
  const mad = findClassSkillRank(servant, prefixes.madEnhancement);
  if (!mad) {
    return { disobeyed: false, originalIntent: chosenIntent, overriddenIntent: chosenIntent, rank: "" };
  }

  // 영주로 오버라이드
  if (commandSealOverride) {
    return { disobeyed: false, originalIntent: chosenIntent, overriddenIntent: chosenIntent, rank: mad.rank };
  }

  const chance = getDisobeyChance(mad.rank);
  if (Math.random() >= chance) {
    return { disobeyed: false, originalIntent: chosenIntent, overriddenIntent: chosenIntent, rank: mad.rank };
  }

  // 명령 무시 시 의도 변경
  let overriddenIntent: Intent;
  switch (chosenIntent) {
    case "hide":
      overriddenIntent = "hunt";
      break;
    case "guard":
      overriddenIntent = Math.random() < 0.5 ? "hunt" : "guard";
      break;
    case "hunt":
      // 이미 사냥이면 변경 없음
      overriddenIntent = "hunt";
      break;
  }

  return { disobeyed: true, originalIntent: chosenIntent, overriddenIntent, rank: mad.rank };
}
