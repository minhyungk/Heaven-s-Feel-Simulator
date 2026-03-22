// ─── Facade: engine/ 모듈을 호출하되 기존 export 시그니처 100% 유지 ───

import type { Servant } from "../data/types";
import { getSkillPrefixes } from "../i18n/skillKeys";
import i18n from "../i18n";
import type { SkillPrefixes } from "../engine/types";
import { resolveCombat as engineResolveCombat } from "../engine/combat";
import { rollIntent as engineRollIntent } from "../engine/intent";
import { checkSpecialAttack } from "../engine/specialAttack";

// ─── Re-export types ───

export type Intent = "hunt" | "guard" | "hide";

export interface SkillEffect {
  key: string;
  params: Record<string, string>;
  servantRefs?: Record<string, number>;
}

export interface CombatResult {
  winner: Servant | null;
  loser: Servant | null;
  isDraw: boolean;
  descriptionKey: string;
  descriptionParams: Record<string, string>;
  winProbabilityA: number;
  skillEffects: SkillEffect[];
}

export interface ServantIntent { servant: Servant; intent: Intent; }
export interface BattleEvent { attacker: Servant; defender: Servant; intentA: Intent; intentB: Intent; result: CombatResult; }
export interface RoundResult { day: number; intents: ServantIntent[]; battles: BattleEvent[]; eliminated: Servant[]; survivors: Servant[]; isQuiet: boolean; }
export interface WarSimulationResult { rounds: RoundResult[]; winner: Servant | null; totalDays: number; }

// ─── Internal helpers (delegate to engine) ───

function getPrefixes(): SkillPrefixes {
  const lang = i18n.language;
  return getSkillPrefixes(lang);
}

function rollIntent(servant: Servant, day: number): Intent {
  return engineRollIntent(servant, day);
}

function resolveCombat(
  a: Servant, b: Servant,
  intentA: Intent, intentB: Intent,
  day: number,
): CombatResult {
  const specialA = checkSpecialAttack(a, b);
  const specialB = checkSpecialAttack(b, a);
  const result = engineResolveCombat(a, b, intentA, intentB, day, getPrefixes(), {
    specialMultiplierA: specialA.triggered ? specialA.multiplier : undefined,
    specialMultiplierB: specialB.triggered ? specialB.multiplier : undefined,
  });
  if (specialA.skillEffect) result.skillEffects.push(specialA.skillEffect);
  if (specialB.skillEffect) result.skillEffects.push(specialB.skillEffect);
  return result;
}

// ─── Round Logic (unchanged) ───

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
