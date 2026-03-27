import type { Servant } from "../data/types";
import type { CombatResult, SkillEffect } from "./types";
import type { NarrativeLine, NarrativeEffect } from "./narrativeFormatter";
import { getVocab } from "../data/classVocabulary";
import type { TileId, Intent } from "./types";
import { findClassSkillRank } from "./combat";
import { getSkillPrefixes } from "../i18n/skillKeys";
import i18n from "../i18n";
import {
  ENCOUNTER_TEMPLATES, CLASH_TEMPLATES, SKILL_TEMPLATES,
  SPECIAL_ATTACK_TEMPLATES, RESULT_TEMPLATES,
  DEFEAT_CRISIS_TEMPLATES, ESCAPE_ATTEMPT_TEMPLATES,
  COUNTER_SEAL_COMBAT_TEMPLATES,
  AREA_EXPLORATION_TEMPLATES, AREA_EXPLORATION_HIDE, AREA_EXPLORATION_GUARD,
  TERRITORY_CREATION_NARRATION, TERRITORY_CREATION_OVERRIDES,
  ENCOUNTER_DETAIL_TEMPLATES,
  pickTemplate,
} from "../data/narrativeTemplates";
import { fixParticles } from "../utils/josa";

// ─── 컨텍스트 ───

export interface NarrativeContext {
  servantA: Servant;
  servantB: Servant;
  combatResult: CombatResult;
  day: number;
  intentMatchup?: "hunt_hunt" | "hunt_guard" | "ambush" | "detected";
  isPlayerInvolved?: boolean;
  /** servantA가 플레이어 서번트인지 (결과 묘사 시 시점 전환) */
  playerIsA?: boolean;
}

// ─── 전투력 차이 분류 ───

type PowerGap = "even" | "advantage" | "overwhelming" | "disadvantage";

function classifyPowerGap(winRate: number): PowerGap {
  if (winRate > 0.7) return "overwhelming";
  if (winRate > 0.55) return "advantage";
  if (winRate < 0.35) return "disadvantage";
  return "even";
}

// ─── 스킬 이름 키워드 기반 카테고리 분류 ───

type SkillCategory =
  | "atk_boost" | "def_boost" | "survival" | "charm"
  | "territory" | "presence_concealment" | "independent_action" | "divinity"
  | "mad_enhancement" | "anti_magic";

function classifySkillByName(skillName: string): SkillCategory {
  const n = skillName;
  if (/전투속행|속행|생존|불굴/.test(n)) return "survival";
  if (/매혹|카리스마|황제특권|황금률/.test(n)) return "charm";
  if (/진지작성|공방/.test(n)) return "territory";
  if (/기척차단|은형|변화|존재감/.test(n)) return "presence_concealment";
  if (/단독행동|단독현현/.test(n)) return "independent_action";
  if (/신성|신격|신비|신령/.test(n)) return "divinity";
  if (/광화/.test(n)) return "mad_enhancement";
  if (/대마력|마술저항/.test(n)) return "anti_magic";
  if (/심안|직감|예지|통찰|감지|투시/.test(n)) return "def_boost";
  if (/완력|괴력|근력|용력|무용|강화|권능|뇌명|방출/.test(n)) return "atk_boost";
  // 기본값: 공격 계열
  return "atk_boost";
}

/** 서번트의 개인 스킬 중 하나를 골라 스킬 발동 NarrativeLine을 생성 */
function generateSkillActivationLine(
  servant: Servant,
  vocab: ReturnType<typeof getVocab>,
  isOpponent: boolean,
): NarrativeLine | null {
  const skills = servant.personalSkills;
  if (!skills || skills.length === 0) return null;

  // 랜덤 스킬 선택
  const skill = skills[Math.floor(Math.random() * skills.length)];
  const category = classifySkillByName(skill.name);
  const pool = SKILL_TEMPLATES.default[category] as string[] | undefined;
  if (!pool || pool.length === 0) return null;

  const template = pool[Math.floor(Math.random() * pool.length)];
  const text = fillTemplate(template, {
    A: servant.name,
    B: servant.name,
    "스킬명": skill.name,
    "무기": vocab.weapon,
    "동사": vocab.verb,
  });

  const isSurvival = category === "survival";
  return {
    text,
    effect: isSurvival ? "critical" : isOpponent ? "stealth_fade" : "normal",
    speed: isSurvival ? "slow" : "normal",
    delay: isSurvival ? 500 : 350,
  };
}

// ─── 템플릿 변수 치환 + 조사 자동화 ───

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return fixParticles(result);
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

  // 3. 서번트 스킬 자동 발동 묘사 (70% 확률로 한 쪽 발동)
  // servantA(플레이어) — 65% 확률
  if (Math.random() < 0.65) {
    const lineA = generateSkillActivationLine(servantA, vocabA, false);
    if (lineA) lines.push(lineA);
  }
  // servantB(적) — 50% 확률
  if (Math.random() < 0.5) {
    const lineB = generateSkillActivationLine(servantB, vocabB, true);
    if (lineB) lines.push(lineB);
  }

  // 4. 전투 옵션 스킬이펙트 (보구/영주/기습 등 결정론적)
  for (const effect of combatResult.skillEffects) {
    const skillLines = formatSkillNarrative(effect, servantA, servantB, vocabA);
    lines.push(...skillLines);
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
    // 플레이어가 servantA이고 패배한 경우 close_loss 시점 사용
    const playerLost = ctx.playerIsA !== false && combatResult.loser.id === servantA.id;
    let resultPool: string[];
    if (isClose && playerLost) {
      resultPool = RESULT_TEMPLATES.default.close_loss;
    } else if (isClose) {
      resultPool = RESULT_TEMPLATES.default.close;
    } else {
      resultPool = RESULT_TEMPLATES.default.decisive;
    }
    let resultVars: Record<string, string>;
    if (isClose && playerLost) {
      // close_loss 템플릿: 패배자(플레이어) 시점 — A=패배자, B=승리자
      resultVars = { ...vars, A: combatResult.loser.name, B: combatResult.winner.name };
    } else {
      // decisive / close 템플릿: 중립 시점 — A=승리자, B=패배자
      resultVars = { ...vars, A: combatResult.winner.name, B: combatResult.loser.name };
    }
    lines.push(makeLine(
      fillTemplate(pick(resultPool), resultVars),
      playerLost ? "critical" : "normal",
      "normal",
      600,
    ));
  }

  return lines;
}

// ─── 패배 위기 서사 생성 ───

export function generateDefeatCrisisNarrative(
  playerServant: Servant,
  enemyServant: Servant,
): NarrativeLine[] {
  const vars = { A: playerServant.name, B: enemyServant.name };
  return [
    makeLine(fillTemplate(pick(DEFEAT_CRISIS_TEMPLATES.phase1), vars), "normal", "normal", 500),
    makeLine(fillTemplate(pick(DEFEAT_CRISIS_TEMPLATES.phase2), vars), "critical", "normal", 600),
    makeLine(fillTemplate(pick(DEFEAT_CRISIS_TEMPLATES.phase3), vars), "critical", "slow", 400),
  ];
}

// ─── 적 영주 사용 전투 서사 생성 ───

export function generateCounterSealNarrative(
  playerServant: Servant,
  enemyServant: Servant,
): NarrativeLine[] {
  const vars = { A: playerServant.name, B: enemyServant.name };
  return [
    makeLine(fillTemplate(pick(COUNTER_SEAL_COMBAT_TEMPLATES.phase1), vars), "normal", "normal", 500),
    makeLine(fillTemplate(pick(COUNTER_SEAL_COMBAT_TEMPLATES.phase2), vars), "critical", "normal", 400),
  ];
}

// ─── 도주 서사 생성 ───

export function generateEscapeNarrative(
  playerServant: Servant,
  enemyServant: Servant,
  outcome: "try" | "success" | "fail" | "refused" | "forcedDefeat" | "success_seal",
  escapeChance?: number,
): NarrativeLine[] {
  const vars = { A: playerServant.name, B: enemyServant.name };

  if (outcome === "success" && escapeChance != null) {
    // 확률에 따른 다른 성공 메시지
    const pool = escapeChance >= 60
      ? ESCAPE_ATTEMPT_TEMPLATES.success_easy
      : escapeChance >= 40
      ? ESCAPE_ATTEMPT_TEMPLATES.success_normal
      : ESCAPE_ATTEMPT_TEMPLATES.success_hard;
    return [makeLine(fillTemplate(pick(pool), vars), "stealth_fade", "normal", 400)];
  }

  if (outcome === "success_seal") {
    return [makeLine(fillTemplate(pick(ESCAPE_ATTEMPT_TEMPLATES.success_seal), vars), "np_glow", "normal", 400)];
  }

  const pool = ESCAPE_ATTEMPT_TEMPLATES[outcome] ?? ESCAPE_ATTEMPT_TEMPLATES.success;
  const template = pick(pool);
  const effect: NarrativeEffect =
    outcome === "success" ? "stealth_fade" :
    outcome === "fail" || outcome === "forcedDefeat" ? "elimination" :
    "normal";
  return [makeLine(
    fillTemplate(template, vars),
    effect,
    outcome === "forcedDefeat" ? "slow" : "normal",
    400,
  )];
}

// ─── 조우 서사 생성 (encounterDecision 페이즈용) ───

export function generateEncounterNarrative(
  playerServant: Servant,
  enemyServant: Servant,
  intentMatchup: "hunt_hunt" | "hunt_guard" | "ambush" | "detected",
  tile: string,
  options?: {
    tileId?: TileId;
    playerIntent?: Intent;
    /** 진지작성 보유 서번트 (해당 타일에) */
    territoryServant?: Servant | null;
  },
): NarrativeLine[] {
  const lines: NarrativeLine[] = [];
  const vars = {
    A: playerServant.name,
    B: enemyServant.name,
    tile,
  };
  const tileId = options?.tileId;
  const playerIntent = options?.playerIntent ?? "hunt";

  // 1. 지역 탐색 묘사 (의도별)
  if (tileId) {
    let areaPool: string[];
    if (playerIntent === "hide") {
      areaPool = AREA_EXPLORATION_HIDE[tileId] ?? [`숨어서 기척을 지우고 있다.`];
    } else if (playerIntent === "guard") {
      areaPool = AREA_EXPLORATION_GUARD[tileId] ?? [`주위를 경계하고 있다.`];
    } else {
      areaPool = AREA_EXPLORATION_TEMPLATES[tileId] ?? [`주위를 탐색하고 있다.`];
    }
    lines.push(makeLine(
      fixParticles(pick(areaPool)),
      "normal",
      "normal",
      400,
    ));
  }

  // 2. 진지작성 묘사 (해당 타일이 ryuudou이거나 진지 보유 시)
  if (options?.territoryServant) {
    const ts = options.territoryServant;
    const prefixes = getSkillPrefixes(i18n.language);
    const tc = findClassSkillRank(ts, prefixes.territoryCreation);
    if (tc) {
      // 오버라이드 체크
      const overrideText = TERRITORY_CREATION_OVERRIDES[ts.id];
      if (overrideText) {
        lines.push(makeLine(fixParticles(overrideText), "normal", "normal", 400));
      } else {
        const rankCategory = tc.score >= 9 ? "ex" : tc.score >= 7 ? "high" : tc.score >= 5 ? "mid" : "low";
        const pool = TERRITORY_CREATION_NARRATION[rankCategory] ?? TERRITORY_CREATION_NARRATION.mid;
        const text = fillTemplate(pick(pool), { A: ts.name, rank: tc.rank });
        lines.push(makeLine(text, "normal", "normal", 400));
      }
    }
  }

  // 3. 조우 묘사 (의도 매칭별 상세)
  // 실제 조우 키 결정: ambush/detected는 그대로, 나머지는 아군 의도 + 적 의도 조합
  let encounterKey = intentMatchup as string;
  if (intentMatchup === "hunt_guard" && playerIntent === "guard") {
    encounterKey = "guard_hunt";
  }

  const detailPool = ENCOUNTER_DETAIL_TEMPLATES[encounterKey];
  if (detailPool) {
    const tileSpecific = tileId ? detailPool[tileId] : undefined;
    const pool = tileSpecific ?? detailPool.default ?? [];
    if (pool.length > 0) {
      lines.push(makeLine(
        fillTemplate(pick(pool), vars),
        intentMatchup === "ambush" ? "stealth_fade" : intentMatchup === "detected" ? "critical" : "normal",
        "normal",
        300,
      ));
    }
  }

  // fallback — 아무 라인도 생성되지 않았으면 기존 템플릿 사용
  if (lines.length === 0) {
    const vocabA = getVocab(playerServant.class);
    const fallbackVars = { ...vars, "무기": vocabA.weapon, "동사": vocabA.verb };
    const pool = ENCOUNTER_TEMPLATES.default[intentMatchup] ?? ENCOUNTER_TEMPLATES.default.hunt_hunt;
    const text = fillTemplate(pickTemplate(pool, ENCOUNTER_TEMPLATES.overrides, playerServant.id), fallbackVars);
    lines.push(makeLine(
      text,
      intentMatchup === "ambush" ? "stealth_fade" : "normal",
      "normal",
      300,
    ));
  }

  return lines;
}

// ─── 스킬 이펙트 → 서사 (복수 라인 반환) ───

function formatSkillNarrative(
  effect: SkillEffect,
  servantA: Servant,
  _servantB: Servant,
  vocabA: ReturnType<typeof getVocab>,
): NarrativeLine[] {
  const { key, params } = effect;

  // NP 관련 — 진명 해방 연출 (다중 라인: 예고 → NP명 → ruby)
  if (key.includes("npFullPower") || key.includes("npDeploy")) {
    // params.name이 실제 NP 발동 서번트, servantB와 비교해 올바른 ruby 선택
    const caster = params.name === _servantB.name ? _servantB : servantA;
    const npName = params.np ?? caster.noblePhantasm?.name ?? "";
    const npRuby = caster.noblePhantasm?.ruby ?? "";
    const casterName = params.name ?? servantA.name;
    const lines: NarrativeLine[] = [];

    // 예고 라인
    lines.push(makeLine(
      fixParticles(`${casterName}의 보구가 발동한다—!`),
      "np_glow",
      "slow",
      600,
    ));

    // NP명 (진명 해방)
    if (npName) {
      lines.push(makeLine(
        `——『${npName}』`,
        "np_glow",
        "slow",
        1200,
      ));
    }

    // Ruby (빠르게, 클라이막스)
    if (npRuby && npRuby !== npName) {
      lines.push(makeLine(
        `${npRuby}!!`,
        "np_glow",
        "fast",
        800,
      ));
    }

    return lines;
  }

  // 특공 — 변수 매핑 수정 (npName → 보구명, defender → B, traits → 특성)
  if (key.includes("specialAttack") || key.includes("trpg:specialAttack")) {
    const traitKey = params.traits?.split(",")[0]?.trim();
    let template: string;
    if (traitKey && SPECIAL_ATTACK_TEMPLATES.specific[traitKey]) {
      template = pick(SPECIAL_ATTACK_TEMPLATES.specific[traitKey]);
    } else {
      template = pick(SPECIAL_ATTACK_TEMPLATES.default);
    }
    const mappedVars: Record<string, string> = {
      A: params.attacker ?? "",
      B: params.defender ?? "",
      "보구명": params.npName ?? params.np ?? "",
      "특성": params.traits ?? "",
      "배율": params.multiplier ?? "",
      ...params,
    };
    return [makeLine(fillTemplate(template, mappedVars), "critical", "normal", 400)];
  }

  // 영주 부스트
  if (key.includes("sealBoost")) {
    return [makeLine(
      fixParticles(`${params.name}의 마스터가 영주를 사용한다! 전투력이 상승!`),
      "np_glow",
      "normal",
      400,
    )];
  }

  // 기습
  if (key === "ambushSuccess") {
    return [makeLine(
      fixParticles(`${params.name}의 기습이 성공했다! (은신 ${params.rank})`),
      "stealth_fade",
      "normal",
      300,
    )];
  }

  if (key === "ambushFail") {
    return [makeLine(
      fixParticles(`${params.name}의 기습이 간파되었다.`),
      "normal",
      "normal",
      300,
    )];
  }

  // 대마력
  if (key.includes("antiMagic")) {
    const pool = SKILL_TEMPLATES.default.anti_magic;
    return [makeLine(fillTemplate(pick(pool), params), "normal", "normal", 300)];
  }

  // 은신 발각 페널티
  if (key.includes("detectedPenalty")) {
    return [makeLine(
      fixParticles(`${params.name}이(가) 은신 발각 페널티를 받았다.`),
      "normal",
      "normal",
      200,
    )];
  }

  // 진지작성
  if (key.includes("territory")) {
    const pool = SKILL_TEMPLATES.default.territory;
    return [makeLine(
      fillTemplate(pick(pool), { A: params.name ?? "", "스킬명": "진지작성" }),
      "normal",
      "normal",
      300,
    )];
  }

  // 액티브 스킬 — 공격
  if (key.includes("skill.atkBoost")) {
    const pool = SKILL_TEMPLATES.default.atk_boost;
    return [makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill, "무기": vocabA.weapon }),
      "normal",
      "normal",
      300,
    )];
  }

  // 액티브 스킬 — 방어
  if (key.includes("skill.defBoost")) {
    const pool = SKILL_TEMPLATES.default.def_boost;
    return [makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill }),
      "normal",
      "normal",
      300,
    )];
  }

  // 액티브 스킬 — 매혹
  if (key.includes("skill.charm")) {
    const pool = SKILL_TEMPLATES.default.charm;
    return [makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill }),
      "normal",
      "normal",
      300,
    )];
  }

  // 액티브 스킬 — 생존
  if (key.includes("skill.survival")) {
    const pool = SKILL_TEMPLATES.default.survival;
    return [makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill }),
      "critical",
      "slow",
      500,
    )];
  }

  // fallback
  if (params.name) {
    return [makeLine(
      fixParticles(`${params.name}의 스킬이 발동했다.`),
      "normal",
      "normal",
      200,
    )];
  }

  return [];
}

// ─── 헬퍼 ───

function makeLine(text: string, effect: NarrativeEffect, speed: "fast" | "normal" | "slow", delay: number): NarrativeLine {
  return { text, effect, speed, delay };
}

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}
