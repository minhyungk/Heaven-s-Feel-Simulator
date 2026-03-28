import type { Servant, ServantClass } from "../data/types";
import { getServantTotalScore, calcWinRate, statRankToScore } from "../data/types";
import type { Intent, SkillEffect, CombatResult, SkillPrefixes } from "./types";
import {
  AMBUSH_MAX_CHANCE, AMBUSH_WIN_BONUS, ANTI_MAGIC_MAX_BONUS,
  GUARD_DEFENSE_BONUS, DRAW_THRESHOLD, DRAW_CHANCES,
  COMBAT_VARIANCE, SEAL_BOOST_MULTIPLIER, NP_FULL_POWER_MULTIPLIER,
  DETECTED_PENALTY,
} from "./config";

const KNIGHT_CLASSES: ServantClass[] = ["Saber", "Lancer", "Archer"];

// ─── 스킬 헬퍼 ───

export function findClassSkillRank(servant: Servant, prefix: string): { rank: string; score: number } | null {
  for (const skill of servant.classSkills) {
    if (skill.name.startsWith(prefix)) {
      const rank = skill.name.replace(prefix, "").trim();
      const score = statRankToScore(rank);
      if (score !== null) return { rank: rank || "?", score };
    }
  }
  return null;
}

// ─── 기습 (Assassin) ───

function applyAmbush(
  servant: Servant, intent: Intent, isAttackerSide: boolean,
  winRateA: number, skillEffects: SkillEffect[], prefixes: SkillPrefixes,
): number {
  if (servant.class !== "Assassin" || intent !== "hunt") return winRateA;
  const pc = findClassSkillRank(servant, prefixes.presenceConcealment);
  if (!pc) return winRateA;

  const ambushChance = Math.min(pc.score / 8 * AMBUSH_MAX_CHANCE, AMBUSH_MAX_CHANCE);
  if (Math.random() < ambushChance) {
    skillEffects.push({ key: "ambushSuccess", params: { name: servant.name, rank: pc.rank }, servantRefs: { name: servant.id } });
    return isAttackerSide
      ? Math.min(winRateA + AMBUSH_WIN_BONUS, 0.99)
      : Math.max(winRateA - AMBUSH_WIN_BONUS, 0.01);
  } else {
    skillEffects.push({ key: "ambushFail", params: { name: servant.name, rank: pc.rank }, servantRefs: { name: servant.id } });
    return winRateA;
  }
}

// ─── 대마력 (Knight vs Caster) ───

function applyAntiMagic(
  caster: Servant, knight: Servant, knightIsA: boolean,
  winRateA: number, skillEffects: SkillEffect[], prefixes: SkillPrefixes,
): number {
  if (caster.class !== "Caster" || !KNIGHT_CLASSES.includes(knight.class)) return winRateA;

  const antiMagic = findClassSkillRank(knight, prefixes.magicResistance);
  if (!antiMagic) return winRateA;

  const toolMaking = findClassSkillRank(caster, prefixes.itemConstruction);
  const territoryCreation = findClassSkillRank(caster, prefixes.territoryCreation);
  const casterDef = toolMaking ?? territoryCreation;
  const defScore = casterDef?.score ?? 0;
  const rawBonus = (antiMagic.score - defScore) / 8 * ANTI_MAGIC_MAX_BONUS;
  const bonus = Math.min(Math.max(rawBonus, 0), ANTI_MAGIC_MAX_BONUS);

  if (bonus <= 0) return winRateA;

  const pctStr = `${Math.round(bonus * 100)}%`;
  if (casterDef) {
    const skillNameKey = toolMaking ? "toolMaking" : "territoryCreation";
    skillEffects.push({
      key: "antiMagicWithDef",
      params: {
        knight: knight.name, antiMagicRank: antiMagic.rank,
        caster: caster.name, skillName: skillNameKey, defRank: casterDef.rank,
        bonus: pctStr,
      },
      servantRefs: { knight: knight.id, caster: caster.id },
    });
  } else {
    skillEffects.push({
      key: "antiMagicNoDef",
      params: { knight: knight.name, antiMagicRank: antiMagic.rank, bonus: pctStr },
      servantRefs: { knight: knight.id },
    });
  }

  return knightIsA
    ? Math.min(winRateA + bonus, 0.99)
    : Math.max(winRateA - bonus, 0.01);
}

// ─── 무승부 확률 ───

function getDrawChance(day: number): number {
  for (const [maxDay, chance] of DRAW_CHANCES) {
    if (day <= maxDay) return chance;
  }
  return 0;
}

// ─── 전투력 변동 ───

function applyVariance(winRateA: number): number {
  const variance = (Math.random() * 2 - 1) * COMBAT_VARIANCE;
  return Math.min(Math.max(winRateA + variance, 0.01), 0.99);
}

// ─── 전투 옵션 (TRPG 확장) ───

export interface CombatOptions {
  /** 영주 부스트 (A 측) */
  sealBoostA?: boolean;
  /** 영주 부스트 (B 측) */
  sealBoostB?: boolean;
  /** 보구 풀파워 (A 측) */
  npFullPowerA?: boolean;
  /** 보구 풀파워 (B 측) */
  npFullPowerB?: boolean;
  /** 은신 발각으로 인한 전투 (A 측) */
  detectedA?: boolean;
  /** 은신 발각으로 인한 전투 (B 측) */
  detectedB?: boolean;
  /** 전투력 변동 적용 */
  applyVariance?: boolean;
  /** 지역 효과 보너스 (A 측) */
  areaBonus?: number;
  /** 진지작성 보너스 (A 측) */
  territoryBonusA?: number;
  /** 진지작성 보너스 (B 측) */
  territoryBonusB?: number;
  /** 특공 배율 (A 측) */
  specialMultiplierA?: number;
  /** 특공 배율 (B 측) */
  specialMultiplierB?: number;
  /** 스탯 페널티 (A 측, 도주 등) */
  scorePenaltyA?: number;
  /** 스탯 페널티 (B 측, 도주 등) */
  scorePenaltyB?: number;
  /** 호감도 보정 (A 측) */
  affectionBonusA?: number;
  /** 호감도 보정 (B 측) */
  affectionBonusB?: number;
  /** 액티브 스킬 보정 (A 측) */
  activeSkillBonusA?: number;
  /** 액티브 스킬 보정 (B 측) */
  activeSkillBonusB?: number;
}

// ─── 강화된 전투 판정 ───

export function resolveCombat(
  a: Servant, b: Servant,
  intentA: Intent, intentB: Intent,
  day: number,
  prefixes: SkillPrefixes,
  options: CombatOptions = {},
): CombatResult {
  const baseScoreA = getServantTotalScore(a);
  const baseScoreB = getServantTotalScore(b);
  const scoreA = baseScoreA - (options.scorePenaltyA ?? 0);
  const scoreB = baseScoreB - (options.scorePenaltyB ?? 0);
  const skillEffects: SkillEffect[] = [];

  // Base Elo win rate
  let winRateA = calcWinRate(scoreA, scoreB);

  // Hunt vs Guard
  if (intentA === "hunt" && intentB === "guard") {
    winRateA = Math.max(winRateA - GUARD_DEFENSE_BONUS, 0.01);
  } else if (intentB === "hunt" && intentA === "guard") {
    winRateA = Math.min(winRateA + GUARD_DEFENSE_BONUS, 0.99);
  }

  // Assassin ambush
  winRateA = applyAmbush(a, intentA, true, winRateA, skillEffects, prefixes);
  winRateA = applyAmbush(b, intentB, false, winRateA, skillEffects, prefixes);

  // Anti-magic (Caster vs Knight)
  winRateA = applyAntiMagic(a, b, false, winRateA, skillEffects, prefixes);
  winRateA = applyAntiMagic(b, a, true, winRateA, skillEffects, prefixes);

  // ─── TRPG 확장 보정 ───

  // 영주 부스트
  if (options.sealBoostA) {
    winRateA = Math.min(winRateA * SEAL_BOOST_MULTIPLIER, 0.99);
    skillEffects.push({ key: "trpg:sealBoost", params: { name: a.name }, servantRefs: { name: a.id } });
  }
  if (options.sealBoostB) {
    winRateA = Math.max(winRateA / SEAL_BOOST_MULTIPLIER, 0.01);
    skillEffects.push({ key: "trpg:sealBoost", params: { name: b.name }, servantRefs: { name: b.id } });
  }

  // 보구 풀파워
  if (options.npFullPowerA) {
    const npScore = statRankToScore(a.stats.np) ?? 5;
    const npBonus = (npScore / 8) * 0.1 * NP_FULL_POWER_MULTIPLIER;
    winRateA = Math.min(winRateA + npBonus, 0.99);
    skillEffects.push({ key: "trpg:npFullPower", params: { name: a.name, np: a.noblePhantasm.name }, servantRefs: { name: a.id } });
  }
  if (options.npFullPowerB) {
    const npScore = statRankToScore(b.stats.np) ?? 5;
    const npBonus = (npScore / 8) * 0.1 * NP_FULL_POWER_MULTIPLIER;
    winRateA = Math.max(winRateA - npBonus, 0.01);
    skillEffects.push({ key: "trpg:npFullPower", params: { name: b.name, np: b.noblePhantasm.name }, servantRefs: { name: b.id } });
  }

  // 은신 발각 페널티
  if (options.detectedA) {
    winRateA = Math.max(winRateA - DETECTED_PENALTY, 0.01);
    skillEffects.push({ key: "trpg:detectedPenalty", params: { name: a.name }, servantRefs: { name: a.id } });
  }
  if (options.detectedB) {
    winRateA = Math.min(winRateA + DETECTED_PENALTY, 0.99);
    skillEffects.push({ key: "trpg:detectedPenalty", params: { name: b.name }, servantRefs: { name: b.id } });
  }

  // 지역 효과 보너스
  if (options.areaBonus) {
    winRateA = Math.min(winRateA + options.areaBonus, 0.99);
  }

  // 진지작성 보너스
  if (options.territoryBonusA) {
    winRateA = Math.min(winRateA + options.territoryBonusA, 0.99);
    skillEffects.push({ key: "trpg:territoryBonus", params: { name: a.name }, servantRefs: { name: a.id } });
  }
  if (options.territoryBonusB) {
    winRateA = Math.max(winRateA - options.territoryBonusB, 0.01);
    skillEffects.push({ key: "trpg:territoryBonus", params: { name: b.name }, servantRefs: { name: b.id } });
  }

  // 특공 보정
  if (options.specialMultiplierA && options.specialMultiplierA > 1) {
    const bonus = (options.specialMultiplierA - 1) * 0.15;
    winRateA = Math.min(winRateA + bonus, 0.99);
  }
  if (options.specialMultiplierB && options.specialMultiplierB > 1) {
    const bonus = (options.specialMultiplierB - 1) * 0.15;
    winRateA = Math.max(winRateA - bonus, 0.01);
  }

  // 호감도 보정
  if (options.affectionBonusA) {
    winRateA = Math.min(Math.max(winRateA + options.affectionBonusA, 0.01), 0.99);
  }
  if (options.affectionBonusB) {
    winRateA = Math.min(Math.max(winRateA - options.affectionBonusB, 0.01), 0.99);
  }

  // 액티브 스킬 보정
  if (options.activeSkillBonusA) {
    winRateA = Math.min(Math.max(winRateA + options.activeSkillBonusA, 0.01), 0.99);
  }
  if (options.activeSkillBonusB) {
    winRateA = Math.min(Math.max(winRateA - options.activeSkillBonusB, 0.01), 0.99);
  }

  // 전투력 변동 (TRPG 모드)
  if (options.applyVariance) {
    winRateA = applyVariance(winRateA);
  }

  // Draw check
  if (Math.abs(winRateA - 0.5) < DRAW_THRESHOLD) {
    if (Math.random() < getDrawChance(day)) {
      return {
        winner: null, loser: null, isDraw: true,
        descriptionKey: "drawResult",
        descriptionParams: { a: a.name, b: b.name },
        winProbabilityA: winRateA, skillEffects,
      };
    }
  }

  // Roll winner
  const winner = Math.random() < winRateA ? a : b;
  const loser = winner === a ? b : a;

  return {
    winner, loser, isDraw: false,
    descriptionKey: "winResult",
    descriptionParams: { winner: winner.name, loser: loser.name },
    winProbabilityA: winRateA, skillEffects,
  };
}
