import type { RoundResult, BattleEvent } from "./types";
import { generateBattleNarrative } from "./narrativeGenerator";
import type { NarrativeContext } from "./narrativeGenerator";

// ─── 타입 ───

export type NarrativeEffect = "normal" | "np_glow" | "critical" | "stealth_fade" | "elimination" | "draw";
export type NarrativeSpeed = "fast" | "normal" | "slow";

export interface NarrativeLine {
  text: string;
  effect: NarrativeEffect;
  speed: NarrativeSpeed;
  delay: number; // ms pause before this line
}

// ─── 의도 매칭 분류 ───

function classifyMatchup(battle: BattleEvent): NarrativeContext["intentMatchup"] {
  const { intentA, intentB } = battle;
  // 기습 체크 (ambush skill effect)
  if (battle.result.skillEffects.some(se => se.key === "ambushSuccess")) return "ambush";
  if (intentA === "hide" || intentB === "hide") return "detected";
  if (intentA === "hunt" && intentB === "hunt") return "hunt_hunt";
  if (intentA === "hunt" && intentB === "guard") return "hunt_guard";
  if (intentA === "guard" && intentB === "hunt") return "hunt_guard";
  return "hunt_hunt";
}

// ─── RoundResult → NarrativeLine[] 변환 ───

export function formatRoundNarrative(round: RoundResult): NarrativeLine[] {
  const lines: NarrativeLine[] = [];

  // 소강 라운드
  if (round.isQuiet) {
    lines.push({
      text: `── ${round.day}일차 밤 ──`,
      effect: "normal",
      speed: "normal",
      delay: 300,
    });
    lines.push({
      text: "후유키 시에 고요한 밤이 찾아왔다.",
      effect: "stealth_fade",
      speed: "normal",
      delay: 500,
    });
    return lines;
  }

  // 밤 시작
  lines.push({
    text: `── ${round.day}일차 밤 ──`,
    effect: "normal",
    speed: "normal",
    delay: 300,
  });

  // 전투들 — narrativeGenerator 사용
  for (const battle of round.battles) {
    const ctx: NarrativeContext = {
      servantA: battle.attacker,
      servantB: battle.defender,
      combatResult: battle.result,
      day: round.day,
      intentMatchup: classifyMatchup(battle),
    };
    lines.push(...generateBattleNarrative(ctx));
  }

  // 탈락자
  for (const eliminated of round.eliminated) {
    lines.push({
      text: `${eliminated.name}(이)가 소멸했다.`,
      effect: "elimination",
      speed: "normal",
      delay: 800,
    });
  }

  return lines;
}
