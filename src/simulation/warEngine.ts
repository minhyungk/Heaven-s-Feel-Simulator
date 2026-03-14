import type { Servant, ServantClass } from "../data/types";
import { getServantTotalScore, calcWinRate, statRankToScore } from "../data/types";
import {
  AMBUSH_MAX_CHANCE, AMBUSH_WIN_BONUS, ANTI_MAGIC_MAX_BONUS,
  GUARD_DEFENSE_BONUS, DRAW_THRESHOLD, DRAW_CHANCES, FORCED_HUNT_DAY,
} from "./config";

// ─── Intent System ───

export type Intent = "hunt" | "guard" | "hide";

const INTENT_WEIGHTS: Record<ServantClass, [number, number, number]> = {
  Saber:      [40, 45, 15],
  Archer:     [35, 40, 25],
  Lancer:     [50, 35, 15],
  Rider:      [45, 30, 25],
  Caster:     [20, 35, 45],
  Assassin:   [25, 20, 55],
  Berserker:  [70, 25, 5],
  Ruler:      [30, 50, 20],
  Avenger:    [65, 25, 10],
  MoonCancer: [35, 30, 35],
  AlterEgo:   [45, 35, 20],
  Foreigner:  [40, 20, 40],
};

function rollIntent(servant: Servant, day: number): Intent {
  if (day >= FORCED_HUNT_DAY) return "hunt";
  const [h, g] = INTENT_WEIGHTS[servant.class];
  const roll = Math.random() * 100;
  if (roll < h) return "hunt";
  if (roll < h + g) return "guard";
  return "hide";
}

// ─── Skill Helpers ───

function findClassSkillRank(servant: Servant, prefix: string): { rank: string; score: number } | null {
  for (const skill of servant.classSkills) {
    if (skill.name.startsWith(prefix)) {
      const rank = skill.name.replace(prefix, "").trim();
      const score = statRankToScore(rank);
      if (score !== null) return { rank: rank || "?", score };
    }
  }
  return null;
}

// ─── Combat System (Elo-based) ───

export interface SkillEffect {
  description: string;
}

export interface CombatResult {
  winner: Servant | null;
  loser: Servant | null;
  isDraw: boolean;
  description: string;
  winProbabilityA: number;
  skillEffects: SkillEffect[];
}

const KNIGHT_CLASSES: ServantClass[] = ["Saber", "Lancer", "Archer"];

function applyAmbush(
  servant: Servant, intent: Intent, isAttackerSide: boolean,
  winRateA: number, skillEffects: SkillEffect[],
): number {
  if (servant.class !== "Assassin" || intent !== "hunt") return winRateA;
  const pc = findClassSkillRank(servant, "기척 차단");
  if (!pc) return winRateA;

  const ambushChance = Math.min(pc.score / 8 * AMBUSH_MAX_CHANCE, AMBUSH_MAX_CHANCE);
  if (Math.random() < ambushChance) {
    skillEffects.push({ description: `${servant.name}의 기습 성공! (기척 차단 ${pc.rank})` });
    return isAttackerSide
      ? Math.min(winRateA + AMBUSH_WIN_BONUS, 0.99)
      : Math.max(winRateA - AMBUSH_WIN_BONUS, 0.01);
  } else {
    skillEffects.push({ description: `${servant.name}의 기습 실패 (기척 차단 ${pc.rank})` });
    return winRateA;
  }
}

function applyAntiMagic(
  caster: Servant, knight: Servant, knightIsA: boolean,
  winRateA: number, skillEffects: SkillEffect[],
): number {
  if (caster.class !== "Caster" || !KNIGHT_CLASSES.includes(knight.class)) return winRateA;

  const antiMagic = findClassSkillRank(knight, "대 마력");
  if (!antiMagic) return winRateA;

  const toolMaking = findClassSkillRank(caster, "도구작성");
  const territoryCreation = findClassSkillRank(caster, "진지작성");
  const casterDef = toolMaking ?? territoryCreation;
  const defScore = casterDef?.score ?? 0;
  const rawBonus = (antiMagic.score - defScore) / 8 * ANTI_MAGIC_MAX_BONUS;
  const bonus = Math.min(Math.max(rawBonus, 0), ANTI_MAGIC_MAX_BONUS);

  if (bonus <= 0) return winRateA;

  const pctStr = `${Math.round(bonus * 100)}%`;
  if (casterDef) {
    const skillName = toolMaking ? "도구작성" : "진지작성";
    skillEffects.push({
      description: `${knight.name}의 대 마력 ${antiMagic.rank}과 ${caster.name}의 ${skillName} ${casterDef.rank}로 ${knight.name}의 승률 ${pctStr} 상승`,
    });
  } else {
    skillEffects.push({
      description: `${knight.name}의 대 마력 ${antiMagic.rank}로 ${knight.name}의 승률 ${pctStr} 상승`,
    });
  }

  return knightIsA
    ? Math.min(winRateA + bonus, 0.99)
    : Math.max(winRateA - bonus, 0.01);
}

function getDrawChance(day: number): number {
  for (const [maxDay, chance] of DRAW_CHANCES) {
    if (day <= maxDay) return chance;
  }
  return 0;
}

function resolveCombat(
  a: Servant, b: Servant,
  intentA: Intent, intentB: Intent,
  day: number,
): CombatResult {
  const scoreA = getServantTotalScore(a);
  const scoreB = getServantTotalScore(b);
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
  winRateA = applyAmbush(a, intentA, true, winRateA, skillEffects);
  winRateA = applyAmbush(b, intentB, false, winRateA, skillEffects);

  // Anti-magic (Caster vs Knight)
  winRateA = applyAntiMagic(a, b, false, winRateA, skillEffects); // a=Caster, b=Knight → knight(b) bonus = winRateA decreases
  winRateA = applyAntiMagic(b, a, true, winRateA, skillEffects);  // b=Caster, a=Knight → knight(a) bonus = winRateA increases

  // Draw check
  if (Math.abs(winRateA - 0.5) < DRAW_THRESHOLD) {
    if (Math.random() < getDrawChance(day)) {
      return {
        winner: null, loser: null, isDraw: true,
        description: `${a.name} vs ${b.name} → 무승부`,
        winProbabilityA: winRateA, skillEffects,
      };
    }
  }

  // Roll winner
  const winner = Math.random() < winRateA ? a : b;
  const loser = winner === a ? b : a;

  return {
    winner, loser, isDraw: false,
    description: `${winner.name} 승리 (vs ${loser.name})`,
    winProbabilityA: winRateA, skillEffects,
  };
}

// ─── Round Logic ───

export interface ServantIntent { servant: Servant; intent: Intent; }
export interface BattleEvent { attacker: Servant; defender: Servant; intentA: Intent; intentB: Intent; result: CombatResult; }
export interface RoundResult { day: number; intents: ServantIntent[]; battles: BattleEvent[]; eliminated: Servant[]; survivors: Servant[]; isQuiet: boolean; }

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function simulateRound(survivors: Servant[], day: number): RoundResult {
  const intents: ServantIntent[] = survivors.map((s) => ({ servant: s, intent: rollIntent(s, day) }));
  const hunters = shuffle(intents.filter((i) => i.intent === "hunt"));
  const guards = shuffle(intents.filter((i) => i.intent === "guard"));
  const battles: BattleEvent[] = [];
  const eliminated: Servant[] = [];
  const matched = new Set<number>();

  for (let i = 0; i + 1 < hunters.length; i += 2) {
    const a = hunters[i], b = hunters[i + 1];
    matched.add(a.servant.id); matched.add(b.servant.id);
    const result = resolveCombat(a.servant, b.servant, a.intent, b.intent, day);
    battles.push({ attacker: a.servant, defender: b.servant, intentA: a.intent, intentB: b.intent, result });
    if (result.loser) eliminated.push(result.loser);
  }

  if (hunters.length % 2 === 1) {
    const odd = hunters[hunters.length - 1];
    matched.add(odd.servant.id);
    const available = guards.filter((g) => !matched.has(g.servant.id));
    if (available.length > 0) {
      const guard = available[Math.floor(Math.random() * available.length)];
      matched.add(guard.servant.id);
      const result = resolveCombat(odd.servant, guard.servant, odd.intent, guard.intent, day);
      battles.push({ attacker: odd.servant, defender: guard.servant, intentA: odd.intent, intentB: guard.intent, result });
      if (result.loser) eliminated.push(result.loser);
    }
  }

  const eliminatedIds = new Set(eliminated.map((e) => e.id));
  return { day, intents, battles, eliminated, survivors: survivors.filter((s) => !eliminatedIds.has(s.id)), isQuiet: battles.length === 0 };
}

export interface WarSimulationResult { rounds: RoundResult[]; winner: Servant | null; totalDays: number; }

export function simulateFullWar(participants: Servant[]): WarSimulationResult {
  const rounds: RoundResult[] = [];
  let survivors = [...participants];
  let day = 1;
  while (survivors.length > 1 && day <= 20) {
    const round = simulateRound(survivors, day);
    rounds.push(round);
    survivors = round.survivors;
    day++;
  }
  return { rounds, winner: survivors.length === 1 ? survivors[0] : null, totalDays: rounds.length };
}
