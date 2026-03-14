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
  if (day >= 7) return "hunt"; // Day 7+: forced hunt

  const [h, g, _hide] = INTENT_WEIGHTS[servant.class];
  const roll = Math.random() * 100;
  if (roll < h) return "hunt";
  if (roll < h + g) return "guard";
  return "hide";
}

// ─── Combat System ───

function getSkillRank(servant: Servant, skillNamePattern: RegExp): number | null {
  for (const skill of servant.classSkills) {
    const match = skill.name.match(skillNamePattern);
    if (match) {
      const rank = skill.name.replace(skillNamePattern, "").trim();
      return statRankToScore(rank);
    }
  }
  return null;
}

function getAntiMagicRank(servant: Servant): number | null {
  for (const skill of servant.classSkills) {
    if (skill.name.startsWith("대마력")) {
      const rank = skill.name.replace("대마력", "").trim();
      return statRankToScore(rank);
    }
  }
  return null;
}

function getCasterDefenseRank(servant: Servant): number | null {
  for (const skill of servant.classSkills) {
    if (skill.name.startsWith("도구작성") || skill.name.startsWith("진지작성")) {
      const rank = skill.name.replace(/도구작성|진지작성/, "").trim();
      return statRankToScore(rank);
    }
  }
  return null;
}

function getPresenceConcealment(servant: Servant): number | null {
  for (const skill of servant.classSkills) {
    if (skill.name.startsWith("기척차단")) {
      const rank = skill.name.replace("기척차단", "").trim();
      return statRankToScore(rank);
    }
  }
  return null;
}

function getNpRankBonus(servant: Servant): number {
  const rank = servant.noblePhantasm.rank;
  const score = statRankToScore(rank);
  return score ?? 5;
}

interface CombatResult {
  winner: Servant | null; // null = draw
  loser: Servant | null;
  isDraw: boolean;
  description: string;
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

  // Situation modifiers
  // Hunt vs Guard: guard gets +10% defense
  if (intentA === "hunt" && intentB === "guard") {
    powerB *= 1.10;
  } else if (intentB === "hunt" && intentA === "guard") {
    powerA *= 1.10;
  }

  // Assassin ambush bonus
  if (a.class === "Assassin" && intentA === "hunt") {
    const pc = getPresenceConcealment(a);
    const bonus = pc ? Math.min(0.20 + (pc - 3) * 0.02, 0.30) : 0.20;
    powerA *= (1 + bonus);
  }
  if (b.class === "Assassin" && intentB === "hunt") {
    const pc = getPresenceConcealment(b);
    const bonus = pc ? Math.min(0.20 + (pc - 3) * 0.02, 0.30) : 0.20;
    powerB *= (1 + bonus);
  }

  // Anti-magic: Caster penalty vs Saber/Lancer/Archer with 대마력
  const ANTI_MAGIC_CLASSES: ServantClass[] = ["Saber", "Lancer", "Archer"];
  if (a.class === "Caster" && ANTI_MAGIC_CLASSES.includes(b.class)) {
    const antiMagic = getAntiMagicRank(b);
    const casterDef = getCasterDefenseRank(a);
    if (antiMagic !== null) {
      const defScore = casterDef ?? 0;
      const penalty = Math.min(Math.max((antiMagic - defScore) / 8 * 0.20, 0), 0.20);
      powerA *= (1 - penalty);
    }
  }
  if (b.class === "Caster" && ANTI_MAGIC_CLASSES.includes(a.class)) {
    const antiMagic = getAntiMagicRank(a);
    const casterDef = getCasterDefenseRank(b);
    if (antiMagic !== null) {
      const defScore = casterDef ?? 0;
      const penalty = Math.min(Math.max((antiMagic - defScore) / 8 * 0.20, 0), 0.20);
      powerB *= (1 - penalty);
    }
  }

  // Random variance ±15-20%
  const varianceA = 1 + (Math.random() * 0.4 - 0.2);
  const varianceB = 1 + (Math.random() * 0.4 - 0.2);
  powerA *= varianceA;
  powerB *= varianceB;

  // Draw check
  const diff = Math.abs(powerA - powerB) / Math.max(powerA, powerB);
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
      };
    }
  }

  const winner = powerA >= powerB ? a : b;
  const loser = powerA >= powerB ? b : a;

  return {
    winner,
    loser,
    isDraw: false,
    description: `${a.name}(${a.class}) vs ${b.name}(${b.class}) → ${winner.name} 승리 (${loser.name} 탈락)`,
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
  isQuiet: boolean; // no battles happened
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
  // Roll intents
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
    // If no guards available, hunter finds no one
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

  while (survivors.length > 1 && day <= 20) { // safety cap
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
