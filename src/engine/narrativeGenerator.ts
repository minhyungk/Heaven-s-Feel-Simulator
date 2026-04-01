import type { Servant } from "../data/types";
import type { CombatResult, SkillEffect } from "./types";
import type { NarrativeLine, NarrativeEffect } from "./narrativeFormatter";
import { getVocab } from "../data/classVocabulary";
import type { TileId, Intent } from "./types";
import { findClassSkillRank } from "./combat";
import { getSkillPrefixes } from "../i18n/skillKeys";
import i18n from "../i18n";
import { getTemplates, pickTemplate } from "../data/narrativeTemplates";
import { fixParticles } from "../utils/josa";
import { getAffinityDialogue } from "../data/affinityDialogues";
import { pickDialogue } from "../data/servantDialogues";

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
  /** 결과 라인 생략 (패배 위기 페이즈에서 "X의 승리" 스포일러 방지) */
  skipResult?: boolean;
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
  // Korean
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
  // English
  if (/Battle Continuation|Disengage|Guts|Protection|Survival|Invincib/i.test(n)) return "survival";
  if (/Charisma|Golden Rule|Emperor/i.test(n)) return "charm";
  if (/Territory Creation/i.test(n)) return "territory";
  if (/Presence Concealment|Shapeshift/i.test(n)) return "presence_concealment";
  if (/Independent Action|Independent Manifestation/i.test(n)) return "independent_action";
  if (/Divinity/i.test(n)) return "divinity";
  if (/Mad Enhancement/i.test(n)) return "mad_enhancement";
  if (/Magic Resistance/i.test(n)) return "anti_magic";
  if (/Mind.s Eye|Instinct|Intuition|Clairvoyance|Foresight|Insight|Detection/i.test(n)) return "def_boost";
  if (/Monstrous Strength|Mana Burst|Bravery|Prana Burst/i.test(n)) return "atk_boost";
  // Japanese
  if (/戦闘続行|仕切り直し|生存|不屈/.test(n)) return "survival";
  if (/魅惑|カリスマ|皇帝特権|黄金律/.test(n)) return "charm";
  if (/陣地作成/.test(n)) return "territory";
  if (/気配遮断|変化|存在感/.test(n)) return "presence_concealment";
  if (/単独行動|単独顕現/.test(n)) return "independent_action";
  if (/神性|神格|神秘|神霊/.test(n)) return "divinity";
  if (/狂化/.test(n)) return "mad_enhancement";
  if (/対魔力|魔術耐性/.test(n)) return "anti_magic";
  if (/心眼|直感|予知|洞察|感知|透視/.test(n)) return "def_boost";
  if (/怪力|筋力|勇猛|強化|権能|雷鳴|魔力放出/.test(n)) return "atk_boost";
  return "atk_boost";
}

/** 서번트의 개인 스킬 중 하나를 골라 스킬 발동 NarrativeLine을 생성 */
function generateSkillActivationLine(
  servant: Servant,
  vocab: ReturnType<typeof getVocab>,
  isOpponent: boolean,
): NarrativeLine | null {
  const T = getTemplates();
  const skills = servant.personalSkills;
  if (!skills || skills.length === 0) return null;

  // 랜덤 스킬 선택
  const skill = skills[Math.floor(Math.random() * skills.length)];
  const category = classifySkillByName(skill.name);
  const pool = T.SKILL_TEMPLATES.default[category] as string[] | undefined;
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

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return i18n.language === "ko" ? fixParticles(result) : result;
}

// ─── 메인 생성기 ───

export function generateBattleNarrative(ctx: NarrativeContext): NarrativeLine[] {
  const T = getTemplates();
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
  const encounterPool = T.ENCOUNTER_TEMPLATES.default[matchup] ?? T.ENCOUNTER_TEMPLATES.default.hunt_hunt;
  lines.push(makeLine(
    fillTemplate(pickTemplate(encounterPool, T.ENCOUNTER_TEMPLATES.overrides, servantA.id), vars),
    matchup === "ambush" ? "stealth_fade" : "normal",
    "normal",
    500,
  ));

  // 1.5 배틀 개시 대사 — 인연대사가 있으면 인연대사 우선, 없으면 Atlas Academy 대사
  const affinity = getAffinityDialogue(servantA.id, servantB.id, i18n.language);
  if (affinity?.clash) {
    const clashA = affinity.clash[servantA.id];
    if (clashA && clashA.length > 0) {
      lines.push(makeLine(`${servantA.name}: "${pick(clashA)}"`, "servant_dialogue", "normal", 500));
    }
    const clashB = affinity.clash[servantB.id];
    if (clashB && clashB.length > 0) {
      lines.push(makeLine(`${servantB.name}: "${pick(clashB)}"`, "servant_dialogue", "normal", 500));
    }
  } else {
    const battleStartA = pickDialogue(servantA.id, "battleStart", i18n.language);
    if (battleStartA) {
      lines.push(makeLine(`${servantA.name}: "${battleStartA}"`, "servant_dialogue", "normal", 500));
    }
    const battleStartB = pickDialogue(servantB.id, "battleStart", i18n.language);
    if (battleStartB) {
      lines.push(makeLine(`${servantB.name}: "${battleStartB}"`, "servant_dialogue", "normal", 500));
    }
  }

  // 2. 교전
  const clashPool = T.CLASH_TEMPLATES.default[powerGap] ?? T.CLASH_TEMPLATES.default.even;
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

  // 4. 결과 (패배 위기 페이즈에서는 스포일러 방지를 위해 생략)
  if (ctx.skipResult) return lines;

  if (combatResult.isDraw) {
    const drawPool = T.RESULT_TEMPLATES.default.draw;
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
      resultPool = T.RESULT_TEMPLATES.default.close_loss;
    } else if (isClose) {
      resultPool = T.RESULT_TEMPLATES.default.close;
    } else {
      resultPool = T.RESULT_TEMPLATES.default.decisive;
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

    // 승리/패배 대사 (Atlas Academy 크롤링 데이터)
    if (combatResult.winner && combatResult.loser) {
      const victoryLine = pickDialogue(combatResult.winner.id, "victory", i18n.language);
      if (victoryLine) {
        lines.push(makeLine(
          `${combatResult.winner.name}: "${victoryLine}"`,
          "servant_dialogue",
          "normal",
          600,
        ));
      }
      const defeatLine = pickDialogue(combatResult.loser.id, "defeat", i18n.language);
      if (defeatLine) {
        lines.push(makeLine(
          `${combatResult.loser.name}: "${defeatLine}"`,
          "servant_dialogue",
          "normal",
          500,
        ));
      }
    }
  }

  return lines;
}

// ─── 패배 위기 서사 생성 ───

export function generateDefeatCrisisNarrative(
  playerServant: Servant,
  enemyServant: Servant,
): NarrativeLine[] {
  const T = getTemplates();
  const vars = { A: playerServant.name, B: enemyServant.name };
  return [
    makeLine(fillTemplate(pick(T.DEFEAT_CRISIS_TEMPLATES.phase1), vars), "normal", "normal", 500),
    makeLine(fillTemplate(pick(T.DEFEAT_CRISIS_TEMPLATES.phase2), vars), "critical", "normal", 600),
    makeLine(fillTemplate(pick(T.DEFEAT_CRISIS_TEMPLATES.phase3), vars), "critical", "slow", 400),
  ];
}

// ─── 적 영주 사용 전투 서사 생성 ───

export function generateCounterSealNarrative(
  playerServant: Servant,
  enemyServant: Servant,
): NarrativeLine[] {
  const T = getTemplates();
  const vars = { A: playerServant.name, B: enemyServant.name };
  return [
    makeLine(fillTemplate(pick(T.COUNTER_SEAL_COMBAT_TEMPLATES.phase1), vars), "normal", "normal", 500),
    makeLine(fillTemplate(pick(T.COUNTER_SEAL_COMBAT_TEMPLATES.phase2), vars), "critical", "normal", 400),
  ];
}

// ─── 도주 서사 생성 ───

export function generateEscapeNarrative(
  playerServant: Servant,
  enemyServant: Servant,
  outcome: "try" | "success" | "fail" | "refused" | "forcedDefeat" | "success_seal",
  escapeChance?: number,
): NarrativeLine[] {
  const T = getTemplates();
  const vars = { A: playerServant.name, B: enemyServant.name };

  if (outcome === "success" && escapeChance != null) {
    // 확률에 따른 다른 성공 메시지
    const pool = escapeChance >= 60
      ? T.ESCAPE_ATTEMPT_TEMPLATES.success_easy
      : escapeChance >= 40
      ? T.ESCAPE_ATTEMPT_TEMPLATES.success_normal
      : T.ESCAPE_ATTEMPT_TEMPLATES.success_hard;
    return [makeLine(fillTemplate(pick(pool), vars), "stealth_fade", "normal", 400)];
  }

  if (outcome === "success_seal") {
    return [makeLine(fillTemplate(pick(T.ESCAPE_ATTEMPT_TEMPLATES.success_seal), vars), "np_glow", "normal", 400)];
  }

  const pool = T.ESCAPE_ATTEMPT_TEMPLATES[outcome] ?? T.ESCAPE_ATTEMPT_TEMPLATES.success;
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
  const T = getTemplates();
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
      areaPool = T.AREA_EXPLORATION_HIDE[tileId] ?? [T.FALLBACK_HIDE];
    } else if (playerIntent === "guard") {
      areaPool = T.AREA_EXPLORATION_GUARD[tileId] ?? [T.FALLBACK_GUARD];
    } else {
      areaPool = T.AREA_EXPLORATION_TEMPLATES[tileId] ?? [T.FALLBACK_EXPLORE];
    }
    lines.push(makeLine(
      i18n.language === "ko" ? fixParticles(pick(areaPool)) : pick(areaPool),
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
      const overrideText = T.TERRITORY_CREATION_OVERRIDES[ts.id];
      if (overrideText) {
        lines.push(makeLine(i18n.language === "ko" ? fixParticles(overrideText) : overrideText, "normal", "normal", 400));
      } else {
        const rankCategory = tc.score >= 9 ? "ex" : tc.score >= 7 ? "high" : tc.score >= 5 ? "mid" : "low";
        const pool = T.TERRITORY_CREATION_NARRATION[rankCategory] ?? T.TERRITORY_CREATION_NARRATION.mid;
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

  const detailPool = T.ENCOUNTER_DETAIL_TEMPLATES[encounterKey];
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
    const pool = T.ENCOUNTER_TEMPLATES.default[intentMatchup] ?? T.ENCOUNTER_TEMPLATES.default.hunt_hunt;
    const text = fillTemplate(pickTemplate(pool, T.ENCOUNTER_TEMPLATES.overrides, playerServant.id), fallbackVars);
    lines.push(makeLine(
      text,
      intentMatchup === "ambush" ? "stealth_fade" : "normal",
      "normal",
      300,
    ));
  }

  // 인연 대사 삽입 (조우)
  const affinity = getAffinityDialogue(playerServant.id, enemyServant.id, i18n.language);
  if (affinity) {
    // 플레이어 서번트 대사
    const playerLines = affinity.encounter[playerServant.id];
    if (playerLines && playerLines.length > 0) {
      lines.push(makeLine(
        `${playerServant.name}: "${pick(playerLines)}"`,
        "servant_dialogue",
        "normal",
        600,
      ));
    }
    // 적 서번트 대사
    const enemyLines = affinity.encounter[enemyServant.id];
    if (enemyLines && enemyLines.length > 0) {
      lines.push(makeLine(
        `${enemyServant.name}: "${pick(enemyLines)}"`,
        "servant_dialogue",
        "normal",
        600,
      ));
    }
    // 특수 묘사
    if (affinity.specialLog) {
      lines.push(makeLine(affinity.specialLog, "np_glow", "slow", 800));
    }
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
  const T = getTemplates();
  const { key, params } = effect;

  // NP 관련 — 진명 해방 연출 (다중 라인: 예고 → NP명 → ruby)
  if (key.includes("npFullPower") || key.includes("npDeploy")) {
    // params.name이 실제 NP 발동 서번트, servantB와 비교해 올바른 ruby 선택
    const caster = params.name === _servantB.name ? _servantB : servantA;
    const npName = params.np ?? caster.noblePhantasm?.name ?? "";
    const npRuby = caster.noblePhantasm?.ruby ?? "";
    const casterName = params.name ?? servantA.name;
    const lines: NarrativeLine[] = [];

    // 예고 라인 — 영주로 보구 사용
    lines.push(makeLine(
      fillTemplate(i18n.t("trpg:narrative.npSealUse", { name: casterName, np: npName }), {}),
      "np_glow",
      "slow",
      600,
    ));

    // 보구 영창 대사 (Atlas Academy 크롤링 데이터)
    const npChant = pickDialogue(caster.id, "npChant", i18n.language);
    if (npChant) {
      lines.push(makeLine(
        `${casterName}: "${npChant}"`,
        "servant_dialogue",
        "slow",
        800,
      ));
    } else {
      // 영창 데이터 없으면 기존 NP명 + Ruby 연출
      if (npName) {
        lines.push(makeLine(
          `——『${npName}』`,
          "np_glow",
          "slow",
          1200,
        ));
      }
      if (npRuby && npRuby !== npName) {
        lines.push(makeLine(
          `${npRuby}!!`,
          "np_glow",
          "fast",
          800,
        ));
      }
    }

    return lines;
  }

  // 특공 — 변수 매핑 수정 (npName → 보구명, defender → B, traits → 특성)
  if (key.includes("specialAttack") || key.includes("trpg:specialAttack")) {
    const traitKey = params.traits?.split(",")[0]?.trim();
    let template: string;
    if (traitKey && T.SPECIAL_ATTACK_TEMPLATES.specific[traitKey]) {
      template = pick(T.SPECIAL_ATTACK_TEMPLATES.specific[traitKey]);
    } else {
      template = pick(T.SPECIAL_ATTACK_TEMPLATES.default);
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
      fillTemplate(i18n.t("trpg:narrative.sealBoost", { name: params.name }), {}),
      "np_glow",
      "normal",
      400,
    )];
  }

  // 기습
  if (key === "ambushSuccess") {
    return [makeLine(
      fillTemplate(i18n.t("trpg:narrative.ambushSuccess", { name: params.name, rank: params.rank }), {}),
      "stealth_fade",
      "normal",
      300,
    )];
  }

  if (key === "ambushFail") {
    return [makeLine(
      fillTemplate(i18n.t("trpg:narrative.ambushFail", { name: params.name }), {}),
      "normal",
      "normal",
      300,
    )];
  }

  // 대마력
  if (key.includes("antiMagic")) {
    const pool = T.SKILL_TEMPLATES.default.anti_magic;
    return [makeLine(fillTemplate(pick(pool), { ...params, A: params.name ?? "" }), "normal", "normal", 300)];
  }

  // 은신 발각 페널티
  if (key.includes("detectedPenalty")) {
    return [makeLine(
      fillTemplate(i18n.t("trpg:narrative.detectedPenalty", { name: params.name }), {}),
      "normal",
      "normal",
      200,
    )];
  }

  // 진지작성
  if (key.includes("territory")) {
    const pool = T.SKILL_TEMPLATES.default.territory;
    const prefixes = getSkillPrefixes(i18n.language);
    return [makeLine(
      fillTemplate(pick(pool), { A: params.name ?? "", "스킬명": prefixes.territoryCreation }),
      "normal",
      "normal",
      300,
    )];
  }

  // 액티브 스킬 — 공격
  if (key.includes("skill.atkBoost")) {
    const pool = T.SKILL_TEMPLATES.default.atk_boost;
    return [makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill, "무기": vocabA.weapon }),
      "normal",
      "normal",
      300,
    )];
  }

  // 액티브 스킬 — 방어
  if (key.includes("skill.defBoost")) {
    const pool = T.SKILL_TEMPLATES.default.def_boost;
    return [makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill }),
      "normal",
      "normal",
      300,
    )];
  }

  // 액티브 스킬 — 매혹
  if (key.includes("skill.charm")) {
    const pool = T.SKILL_TEMPLATES.default.charm;
    return [makeLine(
      fillTemplate(pick(pool), { A: params.name, "스킬명": params.skill }),
      "normal",
      "normal",
      300,
    )];
  }

  // 액티브 스킬 — 생존
  if (key.includes("skill.survival")) {
    const pool = T.SKILL_TEMPLATES.default.survival;
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
      fillTemplate(i18n.t("trpg:narrative.skillFallback", { name: params.name }), {}),
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
