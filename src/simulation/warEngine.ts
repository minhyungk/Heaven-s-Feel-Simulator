import type { Servant, ServantClass } from "../data/types";
import { getServantTotalScore, statRankToScore } from "../data/types";

// ─── Intent System ───

export type Intent = "hunt" | "guard" | "hide";

const INTENT_WEIGHTS: Record<ServantClass, [number, number, number]> = {
  // [hunt, guard, hide]
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
  if (day >= 7) return "hunt";

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

function getNpRankBonus(servant: Servant): number {
  const score = statRankToScore(servant.noblePhantasm.rank);
  return score ?? 5;
}

// ─── Combat System ───

export interface SkillEffect {
  description: string;
}

export interface CombatResult {
  winner: Servant | null;
  loser: Servant | null;
  isDraw: boolean;
  description: string;
  winProbability: number; // attacker's win probability (0-1)
  skillEffects: SkillEffect[];
}

function resolveCombat(
  a: Servant,
  b: Servant,
  intentA: Intent,
  intentB: Intent,
  day: number,
): CombatResult {
  let powerA = getServantTotalScore(a) + getNpRankBonus(a);
  let powerB = getServantTotalScore(b) + getNpRankBonus(b);
  const skillEffects: SkillEffect[] = [];

  // ── Hunt vs Guard: guard gets +10% defense ──
  if (intentA === "hunt" && intentB === "guard") {
    powerB *= 1.10;
  } else if (intentB === "hunt" && intentA === "guard") {
    powerA *= 1.10;
  }

  // ── Assassin ambush system ──
  // 기척차단 rank determines ambush chance (max 30%)
  // If ambush succeeds: +30% win rate bonus
  if (a.class === "Assassin" && intentA === "hunt") {
    const pc = findClassSkillRank(a, "기척차단");
    if (pc) {
      // Ambush chance: rank score / 8 * 30%, capped at 30%
      const ambushChance = Math.min(pc.score / 8 * 0.30, 0.30);
      if (Math.random() < ambushChance) {
        powerA *= 1.30;
        skillEffects.push({ description: `${a.name}의 기습 성공! (기척차단 ${pc.rank})` });
      } else {
        skillEffects.push({ description: `${a.name}의 기습 실패 (기척차단 ${pc.rank})` });
      }
    }
  }
  if (b.class === "Assassin" && intentB === "hunt") {
    const pc = findClassSkillRank(b, "기척차단");
    if (pc) {
      const ambushChance = Math.min(pc.score / 8 * 0.30, 0.30);
      if (Math.random() < ambushChance) {
        powerB *= 1.30;
        skillEffects.push({ description: `${b.name}의 기습 성공! (기척차단 ${pc.rank})` });
      } else {
        skillEffects.push({ description: `${b.name}의 기습 실패 (기척차단 ${pc.rank})` });
      }
    }
  }

  // ── Anti-magic: Caster penalty vs 3기사 (Saber/Lancer/Archer) ──
  // Only the 3 knight classes get a bonus, never a reverse penalty for Caster
  const KNIGHT_CLASSES: ServantClass[] = ["Saber", "Lancer", "Archer"];

  if (a.class === "Caster" && KNIGHT_CLASSES.includes(b.class)) {
    const antiMagic = findClassSkillRank(b, "대마력");
    if (antiMagic) {
      const casterDef = findClassSkillRank(a, "도구작성") ?? findClassSkillRank(a, "진지작성");
      const defScore = casterDef?.score ?? 0;
      const rawPenalty = (antiMagic.score - defScore) / 8 * 0.20;
      const penalty = Math.min(Math.max(rawPenalty, 0), 0.20); // 0% ~ 20%, never negative
      if (penalty > 0) {
        powerA *= (1 - penalty);
        const pctStr = `${Math.round(penalty * 100)}%`;
        if (casterDef) {
          skillEffects.push({
            description: `${b.name}의 대마력 ${antiMagic.rank}과 ${a.name}의 ${casterDef === findClassSkillRank(a, "도구작성") ? "도구작성" : "진지작성"} ${casterDef.rank}로 ${b.name}의 승률 ${pctStr} 상승`,
          });
        } else {
          skillEffects.push({
            description: `${b.name}의 대마력 ${antiMagic.rank}로 ${b.name}의 승률 ${pctStr} 상승`,
          });
        }
      }
    }
  }
  if (b.class === "Caster" && KNIGHT_CLASSES.includes(a.class)) {
    const antiMagic = findClassSkillRank(a, "대마력");
    if (antiMagic) {
      const casterDef = findClassSkillRank(b, "도구작성") ?? findClassSkillRank(b, "진지작성");
      const defScore = casterDef?.score ?? 0;
      const rawPenalty = (antiMagic.score - defScore) / 8 * 0.20;
      const penalty = Math.min(Math.max(rawPenalty, 0), 0.20);
      if (penalty > 0) {
        powerB *= (1 - penalty);
        const pctStr = `${Math.round(penalty * 100)}%`;
        if (casterDef) {
          const skillName = findClassSkillRank(b, "도구작성") ? "도구작성" : "진지작성";
          skillEffects.push({
            description: `${a.name}의 대마력 ${antiMagic.rank}과 ${b.name}의 ${skillName} ${casterDef.rank}로 ${a.name}의 승률 ${pctStr} 상승`,
          });
        } else {
          skillEffects.push({
            description: `${a.name}의 대마력 ${antiMagic.rank}로 ${a.name}의 승률 ${pctStr} 상승`,
          });
        }
      }
    }
  }

  // ── Random variance ±15-20% ──
  const varianceA = 1 + (Math.random() * 0.4 - 0.2);
  const varianceB = 1 + (Math.random() * 0.4 - 0.2);
  const finalA = powerA * varianceA;
  const finalB = powerB * varianceB;

  // Calculate win probability for display (before variance)
  const winProbability = powerA / (powerA + powerB);

  // ── Draw check ──
  const diff = Math.abs(finalA - finalB) / Math.max(finalA, finalB);
  if (diff < 0.10) {
    let drawChance: number;
    if (day <= 2) drawChance = 0.30;
    else if (day <= 4) drawChance = 0.20;
    else if (day <= 6) drawChance = 0.10;
    else drawChance = 0;

    if (Math.random() < drawChance) {
      return {
        winner: null,
        loser: null,
        isDraw: true,
        description: `${a.name}(${a.class}) vs ${b.name}(${b.class}) → 무승부`,
        winProbability,
        skillEffects,
      };
    }
  }

  const winner = finalA >= finalB ? a : b;
  const loser = finalA >= finalB ? b : a;

  return {
    winner,
    loser,
    isDraw: false,
    description: `${a.name}(${a.class}) vs ${b.name}(${b.class}) → ${winner.name} 승리 (${loser.name} 탈락)`,
    winProbability,
    skillEffects,
  };
}

// ─── Round Logic ───

export interface ServantIntent {
  servant: Servant;
  intent: Intent;
}

export interface BattleEvent {
  attacker: Servant;
  defender: Servant;
  intentA: Intent;
  intentB: Intent;
  result: CombatResult;
}

export interface RoundResult {
  day: number;
  intents: ServantIntent[];
  battles: BattleEvent[];
  eliminated: Servant[];
  survivors: Servant[];
  isQuiet: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function simulateRound(survivors: Servant[], day: number): RoundResult {
  const intents: ServantIntent[] = survivors.map((s) => ({
    servant: s,
    intent: rollIntent(s, day),
  }));

  const hunters = shuffle(intents.filter((i) => i.intent === "hunt"));
  const guards = shuffle(intents.filter((i) => i.intent === "guard"));

  const battles: BattleEvent[] = [];
  const eliminated: Servant[] = [];
  const matched = new Set<number>();

  // Pair hunters
  for (let i = 0; i + 1 < hunters.length; i += 2) {
    const a = hunters[i];
    const b = hunters[i + 1];
    matched.add(a.servant.id);
    matched.add(b.servant.id);
    const result = resolveCombat(a.servant, b.servant, a.intent, b.intent, day);
    battles.push({ attacker: a.servant, defender: b.servant, intentA: a.intent, intentB: b.intent, result });
    if (result.loser) eliminated.push(result.loser);
  }

  // Odd hunter vs random guard
  if (hunters.length % 2 === 1) {
    const oddHunter = hunters[hunters.length - 1];
    matched.add(oddHunter.servant.id);
    const availableGuards = guards.filter((g) => !matched.has(g.servant.id));
    if (availableGuards.length > 0) {
      const guard = availableGuards[Math.floor(Math.random() * availableGuards.length)];
      matched.add(guard.servant.id);
      const result = resolveCombat(oddHunter.servant, guard.servant, oddHunter.intent, guard.intent, day);
      battles.push({ attacker: oddHunter.servant, defender: guard.servant, intentA: oddHunter.intent, intentB: guard.intent, result });
      if (result.loser) eliminated.push(result.loser);
    }
  }

  const eliminatedIds = new Set(eliminated.map((e) => e.id));
  const newSurvivors = survivors.filter((s) => !eliminatedIds.has(s.id));

  return {
    day,
    intents,
    battles,
    eliminated,
    survivors: newSurvivors,
    isQuiet: battles.length === 0,
  };
}

// ─── Full War Simulation ───

export interface WarSimulationResult {
  rounds: RoundResult[];
  winner: Servant | null;
  totalDays: number;
}

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

  return {
    rounds,
    winner: survivors.length === 1 ? survivors[0] : null,
    totalDays: rounds.length,
  };
}
