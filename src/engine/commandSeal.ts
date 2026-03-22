import type { Servant } from "../data/types";
import { getServantTotalScore, calcWinRate } from "../data/types";
import type { CommandSealType, MasterState, SkillPrefixes } from "./types";
import { findClassSkillRank } from "./combat";
import { AI_SEAL_LOSE_THRESHOLD } from "./config";

export function canUseSeal(master: MasterState): boolean {
  return master.commandSeals > 0;
}

export function useSeal(master: MasterState, _sealType: CommandSealType): MasterState {
  if (master.commandSeals <= 0) return master;
  return { ...master, commandSeals: master.commandSeals - 1 };
}

export function getAvailableSealTypes(
  master: MasterState,
  servant: Servant,
  prefixes: SkillPrefixes,
  inCombat: boolean,
): CommandSealType[] {
  if (master.commandSeals <= 0) return [];
  const types: CommandSealType[] = [];

  if (inCombat) {
    types.push("boost");
    types.push("npFullPower");
    types.push("escape");
  } else {
    types.push("boost");
  }

  // 광화가 있는 서번트만 madControl 표시
  const mad = findClassSkillRank(servant, prefixes.madEnhancement);
  if (mad) {
    types.push("madControl");
  }

  return types;
}

/** AI 영주 사용 판단: 패배 확률 ≥70% → 부스트 or 도주, 보구 승리 확정 → 풀파워 */
export function decideAISealUse(
  master: MasterState,
  servant: Servant,
  enemy: Servant,
  _prefixes: SkillPrefixes,
): CommandSealType | null {
  if (master.commandSeals <= 0) return null;

  const myScore = getServantTotalScore(servant);
  const enemyScore = getServantTotalScore(enemy);
  const winRate = calcWinRate(myScore, enemyScore);

  // 패배 확률이 높으면 부스트 or 도주
  if (winRate < (1 - AI_SEAL_LOSE_THRESHOLD)) {
    // 매우 불리하면 도주
    if (winRate < 0.15) return "escape";
    return "boost";
  }

  // 약간 유리하고 영주가 넉넉하면 보구 풀파워
  if (winRate > 0.55 && master.commandSeals >= 2) {
    return "npFullPower";
  }

  return null;
}
