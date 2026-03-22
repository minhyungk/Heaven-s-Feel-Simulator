import type { Servant } from "../data/types";
import type { MasterState, SkillPrefixes, SkillEffect } from "./types";
import { findClassSkillRank } from "./combat";
import {
  TERRITORY_CREATION_BONUS,
  INDEPENDENT_ACTION_DAYS,
  INDEPENDENT_ACTION_STAT_PENALTY,
  INDEPENDENT_MANIFESTATION_EXTRA_DAYS,
  INDEPENDENT_MANIFESTATION_PENALTY_REDUCTION,
} from "./config";

// ─── 대마력 ───
// combat.ts 의 applyAntiMagic에서 처리 (기존 로직 확장)

// ─── 기승 ───
// map.ts의 getReachableTiles + escape.ts에서 처리

// ─── 단독행동: 패배 후 잔존 ───

export function getIndependentActionDays(servant: Servant, prefixes: SkillPrefixes): number {
  const ia = findClassSkillRank(servant, prefixes.independentAction);
  if (!ia) return 0;
  return INDEPENDENT_ACTION_DAYS[ia.rank] ?? (ia.score >= 7 ? 3 : ia.score >= 6 ? 2 : 1);
}

export function getIndependentActionPenalty(servant: Servant, prefixes: SkillPrefixes): number {
  const im = findClassSkillRank(servant, prefixes.independentManifestation);
  if (im) return INDEPENDENT_ACTION_STAT_PENALTY * INDEPENDENT_MANIFESTATION_PENALTY_REDUCTION;
  return INDEPENDENT_ACTION_STAT_PENALTY;
}

export function getIndependentManifestationExtraDays(servant: Servant, prefixes: SkillPrefixes): number {
  const im = findClassSkillRank(servant, prefixes.independentManifestation);
  if (im) return INDEPENDENT_MANIFESTATION_EXTRA_DAYS;
  return 0;
}

// ─── 기척차단 ───
// detection.ts에서 처리

// ─── 기척감지 ───
// detection.ts에서 처리

// ─── 광화 ───
// madEnhancement.ts에서 처리

// ─── 도구작성: 매 라운드 랜덤 스탯 부스트 ───

export function hasItemConstruction(servant: Servant, prefixes: SkillPrefixes): boolean {
  return findClassSkillRank(servant, prefixes.itemConstruction) !== null;
}

// ─── 진지작성: 동일 타일 2+ 라운드 체류 시 전투력 보너스 ───

export function getTerritoryCreationBonus(servant: Servant, master: MasterState, prefixes: SkillPrefixes): number {
  const tc = findClassSkillRank(servant, prefixes.territoryCreation);
  if (!tc || master.stayDuration < 2) return 0;
  return TERRITORY_CREATION_BONUS * (tc.score / 8);
}

// ─── 신성: 특공 대상 속성 (Phase 4 연동) ───
// specialAttack.ts에서 처리

// ─── 종합: 전투 전 스킬 보정 수집 ───

export interface ClassSkillModifiers {
  territoryBonusA: number;
  territoryBonusB: number;
  skillEffects: SkillEffect[];
}

export function collectClassSkillModifiers(
  servantA: Servant, masterA: MasterState,
  servantB: Servant, masterB: MasterState,
  prefixes: SkillPrefixes,
): ClassSkillModifiers {
  const skillEffects: SkillEffect[] = [];

  const territoryBonusA = getTerritoryCreationBonus(servantA, masterA, prefixes);
  const territoryBonusB = getTerritoryCreationBonus(servantB, masterB, prefixes);

  if (territoryBonusA > 0) {
    const tc = findClassSkillRank(servantA, prefixes.territoryCreation);
    skillEffects.push({
      key: "trpg:territoryCreation",
      params: { name: servantA.name, rank: tc?.rank ?? "?" },
      servantRefs: { name: servantA.id },
    });
  }

  if (territoryBonusB > 0) {
    const tc = findClassSkillRank(servantB, prefixes.territoryCreation);
    skillEffects.push({
      key: "trpg:territoryCreation",
      params: { name: servantB.name, rank: tc?.rank ?? "?" },
      servantRefs: { name: servantB.id },
    });
  }

  return { territoryBonusA, territoryBonusB, skillEffects };
}
