import type { Servant } from "../data/types";
import type { CombatResult, SkillEffect } from "./types";
import type { NarrativeLine, NarrativeEffect } from "./narrativeFormatter";
import { getVocab } from "../data/classVocabulary";
import {
  ENCOUNTER_TEMPLATES, CLASH_TEMPLATES, SKILL_TEMPLATES,
  NP_TEMPLATES, SPECIAL_ATTACK_TEMPLATES, RESULT_TEMPLATES,
  pickTemplate,
} from "../data/narrativeTemplates";

// ─── 컨텍스트 ───

export interface NarrativeContext {
  servantA: Servant;
  servantB: Servant;
  combatResult: CombatResult;
  day: number;
  intentMatchup?: "hunt_hunt" | "hunt_guard" | "ambush" | "detected";
  isPlayerInvolved?: boolean;
}

// ─── 전투력 차이 분류 ───

type PowerGap = "even" | "advantage" | "overwhelming" | "disadvantage";

function classifyPowerGap(winRate: number): PowerGap {
  if (winRate > 0.7) return "overwhelming";
  if (winRate > 0.55) return "advantage";
  if (winRate < 0.35) return "disadvantage";
  return "even";
}

// ─── 템플릿 변수 치환 ───

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

// ─── 메인 생성기 ───

export function generateBattleNarrative(ctx: NarrativeContext): NarrativeLine[] {
  const { servantA, servantB, combatResult, intentMatchup } = ctx;
  const lines: NarrativeLine[] = [];
  const vocabA = getVocab(servantA.class);
  const vocabB = getVocab(servantB.class);
  const powerGap = classifyPowerGap(combatResult.winProbabilityA);

  const vars = {
    A: servantA.name,
    B: servantB.name,
    "무기": vocabA.weapon,
    "동사": vocabA.verb,
    "무기B": vocabB.weapon,
    "보구명": servantA.noblePhantasm?.name ?? "",
    "보구명B": servantB.noblePhantasm?.name ?? "",
  };

  // 1. 조우
  const matchup = intentMatchup ?? "hunt_hunt";
  const encounterPool = ENCOUNTER_TEMPLATES.default[matchup] ?? ENCOUNTER_TEMPLATES.default.hunt_hunt;
  lines.push(makeLine(
    fillTemplate(pickTemplate(encounterPool, ENCOUNTER_TEMPLATES.overrides, servantA.id), vars),
    matchup === "ambush" ? "stealth_fade" : "normal",
    "normal",
    500,
  ));

  // 2. 교전
  const clashPool = CLASH_TEMPLATES.default[powerGap] ?? CLASH_TEMPLATES.default.even;
  lines.push(makeLine(
    fillTemplate(pick(clashPool), vars),
    "normal",
    "normal",
    400,
  ));

  // 3. 스킬 발동
  for (const effect of combatResult.skillEffects) {
    const skillLine = formatSkillNarrative(effect, servantA, servantB, vocabA);
    if (skillLine) {
      lines.push(skillLine);
    }
  }

  // 4. 결과
  if (combatResult.isDraw) {
    const drawPool = RESULT_TEMPLATES.default.draw;
    lines.push(makeLine(
      fillTemplate(pick(drawPool), vars),
      "draw",
      "normal",
      600,
    ));
  } else if (combatResult.winner && combatResult.loser) {
    const isClose = Math.abs(combatResult.winProbabilityA - 0.5) < 0.15;
    const resultPool = isClose ? RESULT_TEMPLATES.default.close : RESULT_TEMPLATES.default.decisive;
    const resultVars = {
      ...vars,
      A: combatResult.winner.name,
      B: combatResult.loser.name,
    };
    lines.push(makeLine(
      fillTemplate(pick(resultPool), resultVars),
      "normal",
      "normal",
      600,
    ));
  }

  return lines;
}

// ─── 스킬 이펙트 → 서사 ───

function formatSkillNarrative(
  effect: SkillEffect,
  servantA: Servant,
  _servantB: Servant,
  vocabA: ReturnType<typeof getVocab>,
): NarrativeLine | null {
  const { key, params } = effect;

  // NP 관련
  if (key.includes("npFullPower") || key.includes("npDeploy")) {
    const npName = params.np ?? servantA.noblePhantasm?.name ?? "";
    const template = pickTemplate(NP_TEMPLATES.default, NP_TEMPLATES.overrides, servantA.id);
    return makeLine(
      fillTemplate(template, { ...params, "보구명": npName }),
      "np_glow",
      "slow",
      600,
    );
  }

  // 특공
  if (key.includes("specialAttack") || key.includes("special")) {
    const template = pick(SPECIAL_ATTACK_TEMPLATES.default);
    return makeLine(
      fillTemplate(template, params),
      "critical",
      "normal",
      400,
    );
  }

  // 영주 부스트
  if (key.includes("sealBoost")) {
    return makeLine(
      `${params.name}의 마스터가 영주를 사용한다! 전투력이 상승!`,
      "np_glow",
      "normal",
      400,
    );
  }

  // 기습
  if (key === "ambushSuccess") {
    return makeLine(
      `${params.name}의 기습이 성공했다! (은신 ${params.rank})`,
      "stealth_fade",
      "normal",
      300,
    );
  }

  if (key === "ambushFail") {
    return makeLine(
      `${params.name}의 기습이 간파되었다.`,
      "normal",
      "normal",
      300,
    );
  }

  // 대마력
  if (key.includes("antiMagic")) {
    const pool = SKILL_TEMPLATES.default.anti_magic;
    return makeLine(
      fillTemplate(pick(pool), params),
      "normal",
      "normal",
      300,
    );
  }

  // 은신 발각 페널티
  if (key.includes("detectedPenalty")) {
    return makeLine(
      `${params.name}(이)가 은신 발각 페널티를 받았다.`,
      "normal",
      "normal",
      200,
    );
  }

  // 진지작성
  if (key.includes("territory")) {
    return makeLine(
      `${params.name}의 진지작성이 발동! 전투력 보너스.`,
      "normal",
      "normal",
      300,
    );
  }

  // 액티브 스킬 — 공격
  if (key.includes("skill.atkBoost")) {
    const pool = SKILL_TEMPLATES.default.atk_boost;
    return makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill, "무기": vocabA.weapon }),
      "normal",
      "normal",
      300,
    );
  }

  // 액티브 스킬 — 방어
  if (key.includes("skill.defBoost")) {
    const pool = SKILL_TEMPLATES.default.def_boost;
    return makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill }),
      "normal",
      "normal",
      300,
    );
  }

  // 액티브 스킬 — 매혹
  if (key.includes("skill.charm")) {
    const pool = SKILL_TEMPLATES.default.charm;
    return makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill }),
      "normal",
      "normal",
      300,
    );
  }

  // 액티브 스킬 — 생존
  if (key.includes("skill.survival")) {
    const pool = SKILL_TEMPLATES.default.survival;
    return makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill }),
      "critical",
      "slow",
      500,
    );
  }

  // fallback — 알 수 없는 스킬 이펙트도 표시
  if (params.name) {
    return makeLine(
      `${params.name}의 스킬이 발동했다.`,
      "normal",
      "normal",
      200,
    );
  }

  return null;
}

// ─── 헬퍼 ───

function makeLine(text: string, effect: NarrativeEffect, speed: "fast" | "normal" | "slow", delay: number): NarrativeLine {
  return { text, effect, speed, delay };
}

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}
