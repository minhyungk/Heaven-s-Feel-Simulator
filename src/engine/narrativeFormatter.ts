import type { RoundResult, BattleEvent } from "./types";
import { generateBattleNarrative } from "./narrativeGenerator";
import type { NarrativeContext } from "./narrativeGenerator";
import i18n from "../i18n";
import { fixParticles } from "../utils/josa";

// ─── 타입 ───

export type NarrativeEffect = "normal" | "np_glow" | "critical" | "stealth_fade" | "elimination" | "draw" | "servant_dialogue";
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
      text: `── ${i18n.t("trpg:narrative.nightHeader", { day: round.day })} ──`,
      effect: "normal",
      speed: "normal",
      delay: 300,
    });
    lines.push({
      text: i18n.t("trpg:narrative.quietNight"),
      effect: "stealth_fade",
      speed: "normal",
      delay: 500,
    });
    return lines;
  }

  // 밤 시작
  lines.push({
    text: `── ${i18n.t("trpg:narrative.nightHeader", { day: round.day })} ──`,
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
    const eliminatedText = i18n.t("trpg:narrative.eliminated", { name: eliminated.name });
    lines.push({
      text: i18n.language === "ko" ? fixParticles(eliminatedText) : eliminatedText,
      effect: "elimination",
      speed: "normal",
      delay: 800,
    });
  }

  return lines;
}
