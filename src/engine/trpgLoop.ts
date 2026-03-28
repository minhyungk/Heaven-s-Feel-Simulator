import type { Servant } from "../data/types";
import { getServantTotalScore } from "../data/types";
import type {
  TRPGGameState, TRPGAction, MasterState,
  Intent, TileId, SkillPrefixes, LogEntry,
} from "./types";
import { resolveCombat } from "./combat";
import type { CombatOptions } from "./combat";
import { rollIntent } from "./intent";
import { checkMadEnhancement } from "./madEnhancement";
import { attemptEscape } from "./escape";
import { checkDetection } from "./detection";
import { getAreaCombatBonus, resolveAIMovement } from "./map";
import { collectClassSkillModifiers } from "./classSkills";
import { createInitialFog, revealOnEncounter, revealOnCombat, updateFogFromAICombat, getDistanceBetween, revealAllPositions } from "./fog";
import { decideAISealUse } from "./commandSeal";
import { checkSpecialAttack } from "./specialAttack";
import { COMMAND_SEAL_COUNT, FORCED_HUNT_DAY, ESCAPE_STAT_PENALTY } from "./config";
import { getPersonality, getInitialAffection } from "../data/servantPersonality";
import {
  getTier, clampAffection, checkRefusal, getCombatBonus,
  affectionFromAction, affectionFromBattle, affectionFromSeal,
  affectionFromQuietNight, getRefusalOverrideIntent,
} from "./affection";
import { rollManaSupply } from "./manaSupply";
import { processServantSkills, getPassiveModifiers, getSkillWinRateBonus } from "./activeSkills";
// alliance module — placeholder, 추후 활성화
// import { rollAllianceFormation, checkBetrayal, areAllied, removeFromAlliances } from "./alliance";
import { fixParticles } from "../utils/josa";
import * as log from "./logGenerator";

// ─── 초기 상태 생성 ───

const STARTING_POSITIONS: TileId[] = [
  "ryuudou", "miyama", "school", "forest", "bridge", "downtown", "port", "church", "park",
];

export function createInitialState(
  participants: Servant[],
  playerServantId: number,
  isCatalystSummon: boolean = false,
): TRPGGameState {
  const servantMap: Record<number, Servant> = {};
  for (const s of participants) {
    servantMap[s.id] = s;
  }

  // 서번트들을 랜덤 타일에 배치
  const shuffled = [...STARTING_POSITIONS].sort(() => Math.random() - 0.5);
  const masters: MasterState[] = participants.map((s, i) => ({
    servantId: s.id,
    commandSeals: COMMAND_SEAL_COUNT,
    isPlayer: s.id === playerServantId,
    isAlive: true,
    independentActionDays: 0,
    statPenalty: 0,
    position: shuffled[i % shuffled.length],
    stayDuration: 0,
    itemBoostCount: 0,
    escapePenalty: 0,
    escapePenaltyDaysLeft: 0,
    manaStatBonus: 0,
    affection: s.id === playerServantId
      ? getInitialAffection(s.id, s.class, isCatalystSummon)
      : 50, // AI 서번트는 호감도 미사용, 기본값
  }));
  // 추가 필드 초기화는 return 문에서 처리

  const enemyIds = participants.filter(s => s.id !== playerServantId).map(s => s.id);

  return {
    day: 1,
    phase: "intentSelection",
    masters,
    servantMap,
    playerServantId,
    enemyInfo: createInitialFog(enemyIds),
    currentEncounter: null,
    lastCombatResult: null,
    log: [],
    isFinished: false,
    winnerId: null,
    aiTurnResults: [],
    playerIntent: null,
    playerMoveTarget: null,
    pendingEnemySeal: null,
    escapedEnemyId: null,
    escapedViaSeal: false,
    wish: null,
    actionCount: 0,
    alliances: [],
    lastManaSupplyOutcome: null,
    lastAffectionNotification: null,
    manaSupplyWeaknessReason: false,
    forcedBridgeShown: false,
  };
}

// ─── Helper ───

function getAliveMasters(state: TRPGGameState): MasterState[] {
  return state.masters.filter(m => m.isAlive);
}

function getMaster(state: TRPGGameState, servantId: number): MasterState | undefined {
  return state.masters.find(m => m.servantId === servantId);
}

function updateMaster(masters: MasterState[], servantId: number, update: Partial<MasterState>): MasterState[] {
  return masters.map(m => m.servantId === servantId ? { ...m, ...update } : m);
}

function getOccupiedTiles(state: TRPGGameState): Map<TileId, number[]> {
  const map = new Map<TileId, number[]>();
  for (const m of getAliveMasters(state)) {
    const list = map.get(m.position) ?? [];
    list.push(m.servantId);
    map.set(m.position, list);
  }
  return map;
}

/** 전투 후 도주 페널티 리셋 */
function resetEscapePenalties(masters: MasterState[], idA: number, idB: number): MasterState[] {
  return masters.map(m =>
    (m.servantId === idA || m.servantId === idB) && m.escapePenalty > 0
      ? { ...m, escapePenalty: 0 }
      : m
  );
}

/** 승리 시 소원빌기 phase를 거치도록 */
function getGameEndPhase(state: TRPGGameState, winnerId: number | null): "grailWish" | "gameOver" {
  if (winnerId === state.playerServantId && state.wish === null) return "grailWish";
  return "gameOver";
}

/** 전투 결과 처리: 플레이어 패배 시 도주 프롬프트 또는 즉시 게임오버 */
function processCombatOutcome(
  state: TRPGGameState,
  result: import("./types").CombatResult,
  masters: MasterState[],
  enemyInfo: Record<number, import("./types").EnemyInfo>,
  newLogs: LogEntry[],
  extraState?: Partial<TRPGGameState>,
): TRPGGameState {
  const playerServant = state.servantMap[state.playerServantId];
  const enemyServant = result.winner?.id === state.playerServantId ? result.loser : result.winner;

  // 호감도 변화 (전투 결과)
  let battleAffNotification = state.lastAffectionNotification;
  const playerMaster = getMaster({ ...state, masters }, state.playerServantId);
  if (playerMaster) {
    const playerWon = result.winner?.id === state.playerServantId;
    const playerLost = result.loser?.id === state.playerServantId;
    const wasDisadvantaged = result.winProbabilityA < 0.4;
    if (playerWon || playerLost) {
      const affDelta = affectionFromBattle(playerWon, false, wasDisadvantaged);
      const newAff = clampAffection(playerMaster.affection + affDelta);
      masters = updateMaster(masters, state.playerServantId, { affection: newAff });
      newLogs.push(log.logAffectionChange(state.day, playerServant.name, affDelta, playerServant.id));
      const newTier = getTier(newAff);
      if (playerWon) {
        battleAffNotification = {
          message: fixParticles(`전투를 승리했다! ${playerServant.name}은(는) 마스터를 더욱 깊이 신뢰하게 된다.`),
          delta: affDelta, tier: newTier,
        };
      } else {
        battleAffNotification = {
          message: fixParticles(`${playerServant.name}은(는) 패배에 불안한 표정을 짓고 있다.`),
          delta: affDelta, tier: newTier,
        };
      }
    }
  }

  // 플레이어 패배 → 7일차+: 즉시 게임오버, 그 외: 도주 프롬프트
  if (result.loser?.id === state.playerServantId) {
    newLogs.push(log.logCombatResult(
      state.day,
      result.winner?.name ?? enemyServant?.name ?? "",
      result.loser.name,
      result.isDraw,
      result.winner?.id,
      result.loser.id,
    ));

    if (state.day >= FORCED_HUNT_DAY) {
      // 7일차+ 도주 불가 → 전투 묘사 후 패배 (defeatEscapePrompt + canEscape:false)
      masters = updateMaster(masters, state.playerServantId, { isAlive: false });
      newLogs.push(log.logElimination(state.day, playerServant.name, playerServant.id));
      return {
        ...state,
        ...extraState,
        masters,
        enemyInfo,
        currentEncounter: state.currentEncounter
          ? { ...state.currentEncounter, canEscape: false }
          : null,
        lastCombatResult: result,
        pendingEnemySeal: null,
        phase: "defeatEscapePrompt",
        isFinished: true,
        winnerId: null,
        lastAffectionNotification: battleAffNotification,
        log: [...state.log, ...newLogs],
      };
    }

    return {
      ...state,
      ...extraState,
      masters,
      enemyInfo,
      lastCombatResult: result,
      pendingEnemySeal: null,
      phase: "defeatEscapePrompt",
      lastAffectionNotification: battleAffNotification,
      log: [...state.log, ...newLogs],
    };
  }

  // 적 패배
  if (result.loser) {
    masters = updateMaster(masters, result.loser.id, { isAlive: false });
    newLogs.push(log.logElimination(state.day, result.loser.name, result.loser.id));
  }

  newLogs.push(log.logCombatResult(
    state.day,
    result.winner?.name ?? playerServant.name,
    result.loser?.name ?? "",
    result.isDraw,
    result.winner?.id,
    result.loser?.id,
  ));

  const winCheck = checkWinCondition({ ...state, masters });
  return {
    ...state,
    ...extraState,
    masters,
    enemyInfo,
    currentEncounter: null,
    lastCombatResult: result,
    pendingEnemySeal: null,
    phase: "combatResult",
    isFinished: winCheck.finished,
    winnerId: winCheck.winnerId,
    lastAffectionNotification: battleAffNotification,
    log: [...state.log, ...newLogs],
  };
}

function checkWinCondition(state: TRPGGameState): { finished: boolean; winnerId: number | null } {
  const alive = getAliveMasters(state);
  if (alive.length <= 1) {
    return { finished: true, winnerId: alive.length === 1 ? alive[0].servantId : null };
  }
  if (state.day > 14) {
    // 14일 초과 시 가장 강한 서번트 승리
    const strongest = alive.reduce((a, b) => {
      const scoreA = getServantTotalScore(state.servantMap[a.servantId]);
      const scoreB = getServantTotalScore(state.servantMap[b.servantId]);
      return scoreA >= scoreB ? a : b;
    });
    return { finished: true, winnerId: strongest.servantId };
  }
  return { finished: false, winnerId: null };
}

// ─── Reducer ───

export function trpgReducer(
  state: TRPGGameState,
  action: TRPGAction,
  prefixes: SkillPrefixes,
): TRPGGameState {
  switch (action.type) {
    case "selectIntent":
      return handleSelectIntent(state, action.intent, prefixes);
    case "selectMovement":
      return handleSelectMovement(state, action.target, prefixes);
    case "encounterDecision":
      return handleEncounterDecision(state, action.fight, prefixes);
    case "useCommandSeal":
      return handleUseCommandSeal(state, action.sealType, prefixes);
    case "counterSealDecision":
      return handleCounterSealDecision(state, action.useSeal, prefixes);
    case "defeatEscapeDecision":
      return handleDefeatEscapeDecision(state, action.useSeal, prefixes);
    case "setWish":
      return { ...state, wish: action.wish, phase: "gameOver" };
    case "advancePhase":
      return handleAdvancePhase(state, prefixes);
    case "resolveAI":
      return handleResolveAI(state, prefixes);
    case "manaSupply":
      return handleManaSupply(state);
    case "skipManaSupply":
      return { ...state, phase: "nightEnd" };
    default:
      return state;
  }
}

// ─── Phase Handlers ───

function handleSelectIntent(state: TRPGGameState, intent: Intent, prefixes: SkillPrefixes): TRPGGameState {
  if (state.phase !== "intentSelection") return state;

  const playerServant = state.servantMap[state.playerServantId];
  const playerMaster = getMaster(state, state.playerServantId)!;
  const newLogs: LogEntry[] = [];
  let masters = [...state.masters];

  // 호감도 기반 명령 거부 체크
  const tier = getTier(playerMaster.affection);
  let finalIntent = intent;
  let refused = false;

  if (checkRefusal(tier)) {
    const personality = getPersonality(playerServant.id, playerServant.class);
    finalIntent = getRefusalOverrideIntent(personality);
    refused = true;
    newLogs.push(log.logCommandRefusal(state.day, playerServant.name, intent, finalIntent, playerServant.id));
  }

  // 광화 체크 (거부되지 않은 경우에만)
  if (!refused) {
    const madResult = checkMadEnhancement(playerServant, intent, prefixes);
    finalIntent = madResult.overriddenIntent;
    // 의도가 실제로 변경된 경우에만 기록 (hunt→hunt 등 변화 없는 경우 제외)
    if (madResult.disobeyed && finalIntent !== intent) {
      const intentKo: Record<string, string> = { hunt: "사냥", guard: "경계", hide: "은신" };
      newLogs.push(log.logMadDisobey(
        state.day,
        playerServant.name,
        intentKo[intent] ?? intent,
        intentKo[finalIntent] ?? finalIntent,
        playerServant.id,
      ));
    }
  }

  // 행동 선호에 따른 호감도 변화
  const personality = getPersonality(playerServant.id, playerServant.class);
  const affDelta = affectionFromAction(intent, personality);
  let affNotification = state.lastAffectionNotification;
  if (affDelta !== 0) {
    const newAffection = clampAffection(playerMaster.affection + affDelta);
    masters = updateMaster(masters, state.playerServantId, { affection: newAffection });
    newLogs.push(log.logAffectionChange(state.day, playerServant.name, affDelta, playerServant.id));
    const newTier = getTier(newAffection);
    const positiveMsg = fixParticles(`${playerServant.name}은(는) 마스터의 방침을 마음에 들어하는 듯 하다.`);
    const negativeMsg = fixParticles(`${playerServant.name}은(는) 이번 마스터의 선택이 마음에 들지 않는 눈치다.`);
    affNotification = { message: affDelta > 0 ? positiveMsg : negativeMsg, delta: affDelta, tier: newTier };
  }

  // 7일차+ 강제 집합 안내 (최초 1회만)
  const nextPhase = (state.day >= FORCED_HUNT_DAY && !state.forcedBridgeShown)
    ? "forcedBridgeNotice" as const
    : "movementSelection" as const;

  return {
    ...state,
    masters,
    phase: nextPhase,
    playerIntent: finalIntent,
    lastAffectionNotification: affNotification,
    log: [...state.log, ...newLogs],
  };
}

function handleSelectMovement(state: TRPGGameState, target: TileId, prefixes: SkillPrefixes): TRPGGameState {
  if (state.phase !== "movementSelection") return state;

  // 7일차+: 후유키 대교 강제 이동
  const finalTarget = state.day >= FORCED_HUNT_DAY ? "bridge" as TileId : target;

  const playerMaster = getMaster(state, state.playerServantId)!;
  const stayDuration = finalTarget === playerMaster.position ? playerMaster.stayDuration + 1 : 0;

  let masters = updateMaster(state.masters, state.playerServantId, {
    position: finalTarget,
    stayDuration,
  });

  // 같은 타일의 적 확인
  const aliveEnemies = masters.filter(m => m.isAlive && m.servantId !== state.playerServantId && m.position === finalTarget);

  if (aliveEnemies.length > 0 && state.playerIntent !== "hide") {
    // 첫 번째 적과 조우
    const enemy = aliveEnemies[0];
    const enemyServant = state.servantMap[enemy.servantId];
    const playerServant = state.servantMap[state.playerServantId];

    // 적이 은신 중인지 확인 → 발각 체크
    const enemyIntent = rollIntent(enemyServant, state.day);
    let isAmbush = false;
    if (enemyIntent === "hide") {
      const det = checkDetection(enemyServant, playerServant, state.playerIntent ?? "hunt", state.day, finalTarget, prefixes);
      if (!det.detected) {
        // 은신 성공 → 조우 없음
        return {
          ...state,
          masters,
          playerMoveTarget: finalTarget,
          phase: "aiTurn",
        };
      }
      isAmbush = true;
    }

    // 정보 안개 갱신은 조우 결정 후로 지연 (맵 스포일러 방지)

    const newLogs: LogEntry[] = [];
    if (isAmbush) {
      newLogs.push(log.logAmbushDetection(state.day, enemyServant.name, playerServant.id));
    }

    const matchup = isAmbush ? "ambush" as const
      : state.playerIntent === "guard" ? "hunt_guard" as const
      : "hunt_hunt" as const;
    return {
      ...state,
      masters,
      playerMoveTarget: finalTarget,
      currentEncounter: { enemyId: enemy.servantId, canEscape: true, isAmbush, intentMatchup: matchup },
      phase: "encounterDecision",
      log: [...state.log, ...newLogs],
    };
  }

  if (state.playerIntent === "hide" && aliveEnemies.length > 0) {
    // 은신 상태에서 같은 타일 → 발각 체크
    const enemy = aliveEnemies[0];
    const enemyServant = state.servantMap[enemy.servantId];
    const playerServant = state.servantMap[state.playerServantId];
    const enemyIntent = rollIntent(enemyServant, state.day);

    const detectionResult = checkDetection(playerServant, enemyServant, enemyIntent, state.day, finalTarget, prefixes);
    if (detectionResult.detected) {
      // 정보 안개 갱신은 조우 결정 후로 지연 (맵 스포일러 방지)

      const newLogs = [log.logPlayerDetected(state.day, enemyServant.name, enemyServant.id)];

      return {
        ...state,
        masters,
        playerMoveTarget: finalTarget,
        currentEncounter: { enemyId: enemy.servantId, canEscape: true, intentMatchup: "detected" as const },
        phase: "encounterDecision",
        log: [...state.log, ...newLogs],
      };
    }
  }

  // 조우 없음 → AI 턴
  return {
    ...state,
    masters,
    playerMoveTarget: finalTarget,
    phase: "aiTurn",
  };
}

function handleEncounterDecision(state: TRPGGameState, fight: boolean, prefixes: SkillPrefixes): TRPGGameState {
  if (state.phase !== "encounterDecision" || !state.currentEncounter) return state;

  const { enemyId } = state.currentEncounter;
  const playerServant = state.servantMap[state.playerServantId];
  const enemyServant = state.servantMap[enemyId];
  const playerMaster = getMaster(state, state.playerServantId)!;
  const enemyMaster = getMaster(state, enemyId)!;

  // 조우 결정 시점에 정보 안개 갱신 (맵 스포일러 방지를 위해 handleSelectMovement에서 이동)
  let encounterEnemyInfo = { ...state.enemyInfo };
  if (encounterEnemyInfo[enemyId]) {
    encounterEnemyInfo[enemyId] = revealOnEncounter(encounterEnemyInfo[enemyId], enemyServant.class, playerMaster.position);
  }
  // 이후 모든 분기에서 encounterEnemyInfo를 기반으로 상태 반환
  const stateWithFog: TRPGGameState = { ...state, enemyInfo: encounterEnemyInfo };

  if (!fight) {
    // 7일차 이후 도주 불가
    if (state.day >= FORCED_HUNT_DAY) {
      // 도주 불가 → 강제 전투
    } else {
      // 도주 시도
      const escapeResult = attemptEscape(playerServant, enemyServant, prefixes);
      const newLogs = [log.logEscape(state.day, playerServant.name, escapeResult.success, playerServant.id)];

      if (escapeResult.success) {
        // 도주 성공 시 호감도 변화 (위기 탈출: +2 정도)
        let escMasters = [...stateWithFog.masters];
        const escDelta = 2;
        const escAff = clampAffection(playerMaster.affection + escDelta);
        escMasters = updateMaster(escMasters, state.playerServantId, { affection: escAff });
        newLogs.push(log.logAffectionChange(state.day, playerServant.name, escDelta, playerServant.id));
        const escTier = getTier(escAff);
        return {
          ...stateWithFog,
          masters: escMasters,
          currentEncounter: null,
          escapedEnemyId: enemyId,
          phase: "playerEscaped",
          lastAffectionNotification: {
            message: fixParticles(`${playerServant.name}은(는) 마스터의 판단에 안도한 듯 하다.`),
            delta: escDelta,
            tier: escTier,
          },
          log: [...state.log, ...newLogs],
        };
      }
      // 도주 실패 → 강제 전투
    }
  }

  // AI 영주 사용 판단 (#10)
  const enemySeal = decideAISealUse(enemyMaster, enemyServant, playerServant, prefixes, state.day);
  if (enemySeal && enemySeal !== "escape") {
    // 적 AI가 영주를 사용하려 한다 → 카운터 프롬프트
    return {
      ...stateWithFog,
      phase: "counterSealPrompt",
      pendingEnemySeal: enemySeal,
    };
  }

  // 전투 실행
  const playerIntent = state.playerIntent ?? "hunt";
  const enemyIntent = rollIntent(enemyServant, state.day);

  // 클래스 스킬 보정
  const classModifiers = collectClassSkillModifiers(playerServant, playerMaster, enemyServant, enemyMaster, prefixes);

  // 특공 체크
  const specialA = checkSpecialAttack(playerServant, enemyServant);
  const specialB = checkSpecialAttack(enemyServant, playerServant);

  // 적이 도주 영주를 사용한 경우 (escape는 counterSealPrompt로 가지 않음)
  let masters2 = [...state.masters];
  const newLogs2: LogEntry[] = [];
  if (enemySeal === "escape") {
    masters2 = updateMaster(masters2, enemyId, { commandSeals: enemyMaster.commandSeals - 1 });
    newLogs2.push(log.logCommandSeal(state.day, "escape", enemyServant.class));
    newLogs2.push(log.logEscape(state.day, enemyServant.name, true, enemyServant.id));
    return {
      ...stateWithFog,
      masters: masters2,
      currentEncounter: null,
      escapedEnemyId: enemyId,
      escapedViaSeal: true,
      phase: "enemyEscaped",
      log: [...state.log, ...newLogs2],
    };
  }

  // 호감도 전투력 보정
  const affectionTier = getTier(playerMaster.affection);
  const affectionBonus = getCombatBonus(affectionTier);

  // 액티브 스킬 보정
  const playerSkills = processServantSkills(playerServant);
  const enemySkills = processServantSkills(enemyServant);
  const playerSkillMods = getPassiveModifiers(playerSkills, playerServant.name, playerServant.id);
  const enemySkillMods = getPassiveModifiers(enemySkills, enemyServant.name, enemyServant.id);

  const combatOpts: CombatOptions = {
    applyVariance: true,
    areaBonus: getAreaCombatBonus(playerMaster.position, playerServant),
    territoryBonusA: classModifiers.territoryBonusA,
    territoryBonusB: classModifiers.territoryBonusB,
    specialMultiplierA: specialA.triggered ? specialA.multiplier : undefined,
    specialMultiplierB: specialB.triggered ? specialB.multiplier : undefined,
    scorePenaltyA: playerMaster.escapePenalty - playerMaster.manaStatBonus,
    scorePenaltyB: enemyMaster.escapePenalty,
    affectionBonusA: affectionBonus,
    activeSkillBonusA: getSkillWinRateBonus(playerSkillMods),
    activeSkillBonusB: getSkillWinRateBonus(enemySkillMods),
  };

  const result = resolveCombat(
    playerServant, enemyServant,
    playerIntent, enemyIntent,
    state.day, prefixes, combatOpts,
  );

  // 특공 스킬 이펙트 추가
  if (specialA.skillEffect) result.skillEffects.push(specialA.skillEffect);
  if (specialB.skillEffect) result.skillEffects.push(specialB.skillEffect);
  result.skillEffects.push(...classModifiers.skillEffects);
  result.skillEffects.push(...playerSkillMods.effects);
  result.skillEffects.push(...enemySkillMods.effects);

  // 전투 후 페널티 리셋
  masters2 = resetEscapePenalties(masters2, state.playerServantId, enemyId);

  // 정보 공개 (encounterEnemyInfo 기반 — 조우 시 갱신된 안개 위에 전투 공개 추가)
  let combatEnemyInfo = { ...encounterEnemyInfo };
  if (combatEnemyInfo[enemyId]) {
    combatEnemyInfo[enemyId] = revealOnCombat(combatEnemyInfo[enemyId], enemyServant.class, playerMaster.position);
  }

  return processCombatOutcome(stateWithFog, result, masters2, combatEnemyInfo, newLogs2);
}

function handleUseCommandSeal(state: TRPGGameState, sealType: string, prefixes: SkillPrefixes): TRPGGameState {
  const playerMaster = getMaster(state, state.playerServantId)!;
  if (playerMaster.commandSeals <= 0) return state;

  // 조우 시 정보 안개 갱신 (handleSelectMovement에서 지연된 처리)
  if (state.currentEncounter) {
    const encEnemyId = state.currentEncounter.enemyId;
    const encEnemyServant = state.servantMap[encEnemyId];
    let updatedEnemyInfo = { ...state.enemyInfo };
    if (updatedEnemyInfo[encEnemyId]) {
      updatedEnemyInfo[encEnemyId] = revealOnEncounter(updatedEnemyInfo[encEnemyId], encEnemyServant.class, playerMaster.position);
    }
    state = { ...state, enemyInfo: updatedEnemyInfo } as TRPGGameState;
  }

  const newLogs = [log.logCommandSeal(state.day, sealType)];
  let masters = updateMaster(state.masters, state.playerServantId, {
    commandSeals: playerMaster.commandSeals - 1,
  });

  if (sealType === "escape" && state.currentEncounter) {
    // 7일차 이후 도주 불가
    if (state.day >= FORCED_HUNT_DAY) return state;
    // 강제 도주
    const sealEscServant = state.servantMap[state.playerServantId];
    newLogs.push(log.logSealEscape(state.day, sealEscServant.name, state.playerServantId));
    // 영주 도주 호감도 변화
    const sealEscDelta = affectionFromSeal("escape", false);
    const sealEscAff = clampAffection(playerMaster.affection + sealEscDelta);
    masters = updateMaster(masters, state.playerServantId, { affection: sealEscAff });
    newLogs.push(log.logAffectionChange(state.day, sealEscServant.name, sealEscDelta, state.playerServantId));
    const sealEscTier = getTier(sealEscAff);
    return {
      ...state,
      masters,
      currentEncounter: null,
      escapedEnemyId: state.currentEncounter?.enemyId ?? null,
      escapedViaSeal: true,
      phase: "playerEscaped",
      lastAffectionNotification: {
        message: fixParticles(`${sealEscServant.name}은(는) 마스터의 판단에 안도한 듯 하다.`),
        delta: sealEscDelta,
        tier: sealEscTier,
      },
      log: [...state.log, ...newLogs],
    };
  }

  if (sealType === "boost" && state.currentEncounter) {
    // 부스트 전투
    const { enemyId } = state.currentEncounter;
    const playerServant = state.servantMap[state.playerServantId];
    const enemyServant = state.servantMap[enemyId];
    const enemyMaster = getMaster(state, enemyId)!;
    const playerIntent = state.playerIntent ?? "hunt";
    const enemyIntent = rollIntent(enemyServant, state.day);

    const updatedPlayerMaster = { ...playerMaster, commandSeals: playerMaster.commandSeals - 1 };
    const classModifiers = collectClassSkillModifiers(playerServant, updatedPlayerMaster, enemyServant, enemyMaster, prefixes);
    const specialA = checkSpecialAttack(playerServant, enemyServant);
    const specialB = checkSpecialAttack(enemyServant, playerServant);

    const result = resolveCombat(
      playerServant, enemyServant,
      playerIntent, enemyIntent,
      state.day, prefixes,
      {
        sealBoostA: true,
        applyVariance: true,
        areaBonus: getAreaCombatBonus(playerMaster.position, playerServant),
        territoryBonusA: classModifiers.territoryBonusA,
        territoryBonusB: classModifiers.territoryBonusB,
        specialMultiplierA: specialA.triggered ? specialA.multiplier : undefined,
        specialMultiplierB: specialB.triggered ? specialB.multiplier : undefined,
        scorePenaltyA: playerMaster.escapePenalty - playerMaster.manaStatBonus,
        scorePenaltyB: enemyMaster.escapePenalty,
      },
    );
    if (specialA.skillEffect) result.skillEffects.push(specialA.skillEffect);
    if (specialB.skillEffect) result.skillEffects.push(specialB.skillEffect);

    masters = resetEscapePenalties(masters, state.playerServantId, enemyId);
    let enemyInfo = { ...state.enemyInfo };
    if (enemyInfo[enemyId]) {
      enemyInfo[enemyId] = revealOnCombat(enemyInfo[enemyId], enemyServant.class, playerMaster.position);
    }

    return processCombatOutcome(state, result, masters, enemyInfo, newLogs);
  }

  if (sealType === "npFullPower" && state.currentEncounter) {
    const { enemyId } = state.currentEncounter;
    const playerServant = state.servantMap[state.playerServantId];
    const enemyServant = state.servantMap[enemyId];
    const enemyMaster = getMaster(state, enemyId)!;
    const playerIntent = state.playerIntent ?? "hunt";
    const enemyIntent = rollIntent(enemyServant, state.day);

    const updatedPlayerMaster = { ...playerMaster, commandSeals: playerMaster.commandSeals - 1 };
    const classModifiers = collectClassSkillModifiers(playerServant, updatedPlayerMaster, enemyServant, enemyMaster, prefixes);
    const specialA = checkSpecialAttack(playerServant, enemyServant);
    const specialB = checkSpecialAttack(enemyServant, playerServant);

    // 보구 전개 로그
    newLogs.push(log.logNPDeploy(state.day, playerServant.name, playerServant.noblePhantasm.name, playerServant.id));

    const result = resolveCombat(
      playerServant, enemyServant,
      playerIntent, enemyIntent,
      state.day, prefixes,
      {
        npFullPowerA: true,
        applyVariance: true,
        areaBonus: getAreaCombatBonus(playerMaster.position, playerServant),
        territoryBonusA: classModifiers.territoryBonusA,
        territoryBonusB: classModifiers.territoryBonusB,
        specialMultiplierA: specialA.triggered ? specialA.multiplier : undefined,
        specialMultiplierB: specialB.triggered ? specialB.multiplier : undefined,
        scorePenaltyA: playerMaster.escapePenalty - playerMaster.manaStatBonus,
        scorePenaltyB: enemyMaster.escapePenalty,
      },
    );
    if (specialA.skillEffect) result.skillEffects.push(specialA.skillEffect);
    if (specialB.skillEffect) result.skillEffects.push(specialB.skillEffect);

    masters = resetEscapePenalties(masters, state.playerServantId, enemyId);
    let enemyInfo = { ...state.enemyInfo };
    if (enemyInfo[enemyId]) {
      enemyInfo[enemyId] = revealOnCombat(enemyInfo[enemyId], enemyServant.class, playerMaster.position);
    }

    return processCombatOutcome(state, result, masters, enemyInfo, newLogs);
  }

  if (sealType === "madControl") {
    // 광화 제어 → 영주만 소비, 다음 광화 체크 무시
    return {
      ...state,
      masters,
      log: [...state.log, ...newLogs],
    };
  }

  return { ...state, masters, log: [...state.log, ...newLogs] };
}

function handleCounterSealDecision(state: TRPGGameState, useSeal: import("./types").CommandSealType | null, prefixes: SkillPrefixes): TRPGGameState {
  if (state.phase !== "counterSealPrompt" || !state.currentEncounter) return state;

  const { enemyId } = state.currentEncounter;
  const playerServant = state.servantMap[state.playerServantId];
  const enemyServant = state.servantMap[enemyId];
  const playerMaster = getMaster(state, state.playerServantId)!;
  const enemyMaster = getMaster(state, enemyId)!;

  const enemySeal = state.pendingEnemySeal;
  const playerIntent = state.playerIntent ?? "hunt";
  const enemyIntent = rollIntent(enemyServant, state.day);

  const classModifiers = collectClassSkillModifiers(playerServant, playerMaster, enemyServant, enemyMaster, prefixes);
  const specialA = checkSpecialAttack(playerServant, enemyServant);
  const specialB = checkSpecialAttack(enemyServant, playerServant);

  const combatOpts: CombatOptions = {
    applyVariance: true,
    areaBonus: getAreaCombatBonus(playerMaster.position, playerServant),
    territoryBonusA: classModifiers.territoryBonusA,
    territoryBonusB: classModifiers.territoryBonusB,
    sealBoostA: useSeal === "boost",
    sealBoostB: enemySeal === "boost",
    npFullPowerA: useSeal === "npFullPower",
    npFullPowerB: enemySeal === "npFullPower",
    specialMultiplierA: specialA.triggered ? specialA.multiplier : undefined,
    specialMultiplierB: specialB.triggered ? specialB.multiplier : undefined,
    scorePenaltyA: playerMaster.escapePenalty - playerMaster.manaStatBonus,
    scorePenaltyB: enemyMaster.escapePenalty,
  };

  let masters = [...state.masters];
  const newLogs: LogEntry[] = [];

  // 적 영주 소비
  if (enemySeal) {
    masters = updateMaster(masters, enemyId, { commandSeals: enemyMaster.commandSeals - 1 });
    newLogs.push(log.logCommandSeal(state.day, enemySeal, enemyServant.class));
  }

  // 플레이어 영주 소비
  if (useSeal) {
    masters = updateMaster(masters, state.playerServantId, { commandSeals: playerMaster.commandSeals - 1 });
    newLogs.push(log.logCommandSeal(state.day, useSeal));
  }

  const result = resolveCombat(
    playerServant, enemyServant,
    playerIntent, enemyIntent,
    state.day, prefixes, combatOpts,
  );

  if (specialA.skillEffect) result.skillEffects.push(specialA.skillEffect);
  if (specialB.skillEffect) result.skillEffects.push(specialB.skillEffect);
  result.skillEffects.push(...classModifiers.skillEffects);

  masters = resetEscapePenalties(masters, state.playerServantId, enemyId);
  let enemyInfo = { ...state.enemyInfo };
  if (enemyInfo[enemyId]) {
    enemyInfo[enemyId] = revealOnCombat(enemyInfo[enemyId], enemyServant.class, playerMaster.position);
  }

  return processCombatOutcome(state, result, masters, enemyInfo, newLogs);
}

function handleDefeatEscapeDecision(state: TRPGGameState, useSeal: boolean, prefixes: SkillPrefixes): TRPGGameState {
  if (state.phase !== "defeatEscapePrompt" || !state.currentEncounter) return state;

  const { enemyId } = state.currentEncounter;
  const playerServant = state.servantMap[state.playerServantId];
  const enemyServant = state.servantMap[enemyId];
  const playerMaster = getMaster(state, state.playerServantId)!;
  const newLogs: LogEntry[] = [];
  let masters = [...state.masters];

  // 7일차 이후 도주 불가 → 연속 서사 후 패배
  if (state.day >= FORCED_HUNT_DAY) {
    masters = updateMaster(masters, state.playerServantId, { isAlive: false });
    newLogs.push(log.logElimination(state.day, playerServant.name, playerServant.id));
    return {
      ...state,
      masters,
      currentEncounter: null,
      escapedEnemyId: enemyId,
      phase: "playerDefeated",
      isFinished: true,
      winnerId: null,
      log: [...state.log, ...newLogs],
    };
  }

  if (useSeal && playerMaster.commandSeals > 0) {
    // 영주 사용 확정 도주
    masters = updateMaster(masters, state.playerServantId, { commandSeals: playerMaster.commandSeals - 1, escapePenalty: ESCAPE_STAT_PENALTY, escapePenaltyDaysLeft: 2 });
    newLogs.push(log.logCommandSeal(state.day, "escape"));
    newLogs.push(log.logSealEscape(state.day, playerServant.name, playerServant.id));
    // 영주 도주 호감도 변화
    const defSealDelta = affectionFromSeal("escape", false);
    const defSealAff = clampAffection(playerMaster.affection + defSealDelta);
    masters = updateMaster(masters, state.playerServantId, { affection: defSealAff });
    newLogs.push(log.logAffectionChange(state.day, playerServant.name, defSealDelta, playerServant.id));
    const defSealTier = getTier(defSealAff);
    return {
      ...state,
      masters,
      currentEncounter: null,
      lastCombatResult: null,
      escapedEnemyId: enemyId,
      escapedViaSeal: true,
      phase: "playerEscaped",
      lastAffectionNotification: {
        message: fixParticles(`위기를 넘겼다. ${playerServant.name}은(는) 마스터의 판단에 안도한 듯 하다.`),
        delta: defSealDelta,
        tier: defSealTier,
      },
      log: [...state.log, ...newLogs],
    };
  }

  // 낮은 호감도 시 도주 거부 체크
  const tier = getTier(playerMaster.affection);
  const refusalChanceEscape = tier === "hostile" ? 0.5 : tier === "wary" ? 0.25 : 0;
  if (refusalChanceEscape > 0 && Math.random() < refusalChanceEscape) {
    // 서번트 도주 거부 → 강제 전투 → 패배 처리
    newLogs.push(log.logCommandRefusal(state.day, playerServant.name, "escape", "hunt", playerServant.id));
    masters = updateMaster(masters, state.playerServantId, { isAlive: false });
    newLogs.push(log.logElimination(state.day, playerServant.name, playerServant.id));
    return {
      ...state,
      masters,
      currentEncounter: null,
      phase: "playerDefeated",
      isFinished: true,
      winnerId: null,
      lastAffectionNotification: {
        message: fixParticles(`${playerServant.name}은(는) 후퇴를 거부하고 싸움을 속행한다! (마스터 신뢰: 낮음)`),
        delta: 0,
        tier,
      },
      log: [...state.log, ...newLogs],
    };
  }

  // 일반 도주 시도
  const escapeResult = attemptEscape(playerServant, enemyServant, prefixes);
  newLogs.push(log.logEscape(state.day, playerServant.name, escapeResult.success, playerServant.id));

  if (escapeResult.success) {
    masters = updateMaster(masters, state.playerServantId, { escapePenalty: ESCAPE_STAT_PENALTY, escapePenaltyDaysLeft: 2 });
    // 위기 탈출 호감도 변화
    const defEscDelta = 2;
    const defEscAff = clampAffection(playerMaster.affection + defEscDelta);
    masters = updateMaster(masters, state.playerServantId, { affection: defEscAff });
    newLogs.push(log.logAffectionChange(state.day, playerServant.name, defEscDelta, playerServant.id));
    const defEscTier = getTier(defEscAff);
    return {
      ...state,
      masters,
      currentEncounter: null,
      lastCombatResult: null,
      escapedEnemyId: enemyId,
      phase: "playerEscaped",
      lastAffectionNotification: {
        message: fixParticles(`위기를 넘겼다. ${playerServant.name}은(는) 마스터의 판단에 안도한 듯 하다.`),
        delta: defEscDelta,
        tier: defEscTier,
      },
      log: [...state.log, ...newLogs],
    };
  }

  // 도주 실패 → 진짜 패배 → 연속 서사 후 게임 오버
  masters = updateMaster(masters, state.playerServantId, { isAlive: false });
  newLogs.push(log.logElimination(state.day, playerServant.name, playerServant.id));

  return {
    ...state,
    masters,
    currentEncounter: null,
    escapedEnemyId: enemyId,
    phase: "playerDefeated",
    isFinished: true,
    winnerId: null,
    log: [...state.log, ...newLogs],
  };
}

function handleAdvancePhase(state: TRPGGameState, _prefixes: SkillPrefixes): TRPGGameState {
  if (state.phase === "forcedBridgeNotice") {
    return { ...state, phase: "movementSelection", forcedBridgeShown: true };
  }
  if (state.phase === "combatResult") {
    // 전투 후 승리 조건 체크 → 게임 종료 or 계속
    if (state.isFinished) {
      return { ...state, phase: getGameEndPhase(state, state.winnerId), lastCombatResult: null, lastAffectionNotification: null };
    }
    return { ...state, phase: "aiTurn", lastCombatResult: null, lastAffectionNotification: null };
  }
  if (state.phase === "playerEscaped") {
    return { ...state, escapedEnemyId: null, escapedViaSeal: false, phase: "aiTurn", lastAffectionNotification: null };
  }
  if (state.phase === "enemyEscaped") {
    return { ...state, escapedEnemyId: null, escapedViaSeal: false, phase: "aiTurn", lastAffectionNotification: null };
  }
  if (state.phase === "manaSupplyResult") {
    return { ...state, phase: "nightEnd", lastAffectionNotification: null };
  }
  if (state.phase === "grailWish") {
    return { ...state, phase: "gameOver" };
  }
  if (state.phase === "defeatEscapePrompt" && state.isFinished) {
    // 7일차+ 도주 불가 패배 → gameOver 직행
    return { ...state, phase: "gameOver", currentEncounter: null };
  }
  if (state.phase === "playerDefeated") {
    return { ...state, phase: "gameOver" };
  }
  if (state.phase === "nightEnd") {
    const winCheck = checkWinCondition(state);
    if (winCheck.finished) {
      const newLogs: LogEntry[] = [];
      if (winCheck.winnerId) {
        const winnerServant = state.servantMap[winCheck.winnerId];
        newLogs.push(log.logGameOver(state.day, winnerServant.name, winnerServant.id));
      }
      return { ...state, phase: getGameEndPhase(state, winCheck.winnerId), isFinished: true, winnerId: winCheck.winnerId, log: [...state.log, ...newLogs] };
    }
    const nextDay = state.day + 1;
    let enemyInfo = state.enemyInfo;
    // Day 7+: 전체 위치 공개 (#8)
    if (nextDay >= 7) {
      enemyInfo = revealAllPositions(enemyInfo, state.masters);
    }
    return { ...state, day: nextDay, phase: "intentSelection", aiTurnResults: [], playerIntent: null, playerMoveTarget: null, actionCount: 0, enemyInfo, lastAffectionNotification: null };
  }
  return state;
}

function handleResolveAI(state: TRPGGameState, prefixes: SkillPrefixes): TRPGGameState {
  if (state.phase !== "aiTurn") return state;

  const isSecondAction = state.actionCount >= 1;
  let masters = [...state.masters];
  let enemyInfo = { ...state.enemyInfo };
  const newLogs: LogEntry[] = [];

  // 첫 번째 행동 후에는 AI 이동/전투 없이 바로 다음 행동으로
  if (!isSecondAction) {
    return {
      ...state,
      masters,
      enemyInfo,
      actionCount: 1,
      phase: "intentSelection",
      playerIntent: null,
      playerMoveTarget: null,
    };
  }

  // 두 번째 행동 후: AI 이동 + 전투 + nightEnd
  const aiEnemies = masters.filter(m => m.isAlive && !m.isPlayer);

  // AI 의도 결정
  const aiIntents: Map<number, Intent> = new Map();
  for (const m of aiEnemies) {
    const servant = state.servantMap[m.servantId];
    let intent = rollIntent(servant, state.day);

    // 광화 체크 (#11: AI는 클래스명 사용, 의도 변화 시만 기록)
    const madResult = checkMadEnhancement(servant, intent, prefixes);
    if (madResult.disobeyed && madResult.overriddenIntent !== intent) {
      intent = madResult.overriddenIntent;
      const intentKoAI: Record<string, string> = { hunt: "사냥", guard: "경계", hide: "은신" };
      newLogs.push(log.logMadDisobey(
        state.day,
        servant.name,
        intentKoAI[madResult.originalIntent] ?? madResult.originalIntent,
        intentKoAI[intent] ?? intent,
        servant.id,
        servant.class,
      ));
    } else if (madResult.disobeyed) {
      intent = madResult.overriddenIntent;
    }

    aiIntents.set(m.servantId, intent);
  }

  // AI 이동 (7일차+: 전원 후유키 대교 집합)
  const occupiedTiles = getOccupiedTiles({ ...state, masters });
  for (const m of aiEnemies) {
    const servant = state.servantMap[m.servantId];
    const intent = aiIntents.get(m.servantId) ?? "guard";
    const newPos = state.day >= FORCED_HUNT_DAY ? "bridge" as TileId : resolveAIMovement(m, servant, intent, prefixes, occupiedTiles);
    const stayDuration = newPos === m.position ? m.stayDuration + 1 : 0;
    masters = updateMaster(masters, m.servantId, { position: newPos, stayDuration });
  }

  // 동맹/배신 — placeholder (추후 활성화)
  const alliances = [...state.alliances];

  // AI 간 조우 및 전투
  const matched = new Set<number>();

  for (const m of aiEnemies) {
    if (matched.has(m.servantId)) continue;
    if (!masters.find(x => x.servantId === m.servantId)?.isAlive) continue;

    const currentMaster = masters.find(x => x.servantId === m.servantId)!;
    const intent = aiIntents.get(m.servantId) ?? "guard";
    if (intent === "hide") continue;

    // 같은 타일의 다른 AI
    const sameTileEnemies = masters.filter(x =>
      x.isAlive && x.servantId !== m.servantId &&
      !x.isPlayer && !matched.has(x.servantId) &&
      x.position === currentMaster.position
    );

    for (const enemy of sameTileEnemies) {
      // 동맹 중인 서번트끼리는 전투 스킵 (placeholder — 현재 동맹 비활성)
      // if (areAllied(alliances, m.servantId, enemy.servantId)) continue;

      const enemyIntent = aiIntents.get(enemy.servantId) ?? "guard";
      if (enemyIntent === "hide") {
        // 은신 발각 체크
        const hider = state.servantMap[enemy.servantId];
        const seeker = state.servantMap[m.servantId];
        const det = checkDetection(hider, seeker, intent, state.day, currentMaster.position, prefixes);
        if (!det.detected) continue;
        newLogs.push(log.logDetection(state.day, hider.name, seeker.name, hider.id, seeker.id));
      }

      matched.add(m.servantId);
      matched.add(enemy.servantId);

      const sA = state.servantMap[m.servantId];
      const sB = state.servantMap[enemy.servantId];
      const mA = masters.find(x => x.servantId === m.servantId)!;
      const mB = masters.find(x => x.servantId === enemy.servantId)!;

      // AI 영주 사용 판단
      const sealA = decideAISealUse(mA, sA, sB, prefixes, state.day);
      const sealB = decideAISealUse(mB, sB, sA, prefixes, state.day);

      if (sealA === "escape") {
        masters = updateMaster(masters, m.servantId, { commandSeals: mA.commandSeals - 1 });
        newLogs.push(log.logCommandSeal(state.day, "escape", sA.class));
        continue;
      }
      if (sealB === "escape") {
        masters = updateMaster(masters, enemy.servantId, { commandSeals: mB.commandSeals - 1 });
        newLogs.push(log.logCommandSeal(state.day, "escape", sB.class));
        continue;
      }

      if (sealA) masters = updateMaster(masters, m.servantId, { commandSeals: mA.commandSeals - 1 });
      if (sealB) masters = updateMaster(masters, enemy.servantId, { commandSeals: mB.commandSeals - 1 });

      const classModifiers = collectClassSkillModifiers(sA, mA, sB, mB, prefixes);
      const aiSpecialA = checkSpecialAttack(sA, sB);
      const aiSpecialB = checkSpecialAttack(sB, sA);

      const result = resolveCombat(
        sA, sB, intent, enemyIntent,
        state.day, prefixes,
        {
          sealBoostA: sealA === "boost",
          sealBoostB: sealB === "boost",
          npFullPowerA: sealA === "npFullPower",
          npFullPowerB: sealB === "npFullPower",
          applyVariance: true,
          territoryBonusA: classModifiers.territoryBonusA,
          territoryBonusB: classModifiers.territoryBonusB,
          specialMultiplierA: aiSpecialA.triggered ? aiSpecialA.multiplier : undefined,
          specialMultiplierB: aiSpecialB.triggered ? aiSpecialB.multiplier : undefined,
          scorePenaltyA: mA.escapePenalty,
          scorePenaltyB: mB.escapePenalty,
        },
      );

      // 전투 후 페널티 리셋
      masters = resetEscapePenalties(masters, m.servantId, enemy.servantId);

      // 정보 안개 갱신 (플레이어 시점)
      const playerMaster = masters.find(x => x.isPlayer)!;
      enemyInfo = updateFogFromAICombat(
        enemyInfo, m.servantId, enemy.servantId,
        currentMaster.position, playerMaster.position,
        sA.class, sB.class,
      );

      if (result.loser) {
        masters = updateMaster(masters, result.loser.id, { isAlive: false });
        newLogs.push(log.logElimination(state.day, result.loser.name, result.loser.id));
      }

      // 거리별 로그
      const dist = getDistanceBetween(playerMaster.position, currentMaster.position);
      newLogs.push(log.logAICombatNews(state.day, sA.class, sB.class, "", dist));

      break; // 한 서번트는 한 번만 전투
    }
  }

  // 승리 조건 체크
  const winCheck = checkWinCondition({ ...state, masters });

  if (winCheck.finished) {
    if (winCheck.winnerId) {
      const w = state.servantMap[winCheck.winnerId];
      newLogs.push(log.logGameOver(state.day, w.name, w.id));
    }
    return {
      ...state,
      masters,
      enemyInfo,
      alliances,
      actionCount: 0,
      phase: getGameEndPhase(state, winCheck.winnerId),
      isFinished: true,
      winnerId: winCheck.winnerId,
      aiTurnResults: newLogs,
      log: [...state.log, ...newLogs],
    };
  }

  // Day 7+: 전체 위치 공개 (#8)
  if (state.day >= 7) {
    enemyInfo = revealAllPositions(enemyInfo, masters);
  }

  // 도주 페널티 회복 (2밤 경과 후 리셋)
  for (const m of masters) {
    if (m.isAlive && m.escapePenalty > 0) {
      const daysLeft = m.escapePenaltyDaysLeft - 1;
      if (daysLeft <= 0) {
        // 완전 회복
        if (m.isPlayer) {
          const servant = state.servantMap[m.servantId];
          newLogs.push(log.logEscapeRecovery(state.day, servant.name, servant.id));
        }
        masters = updateMaster(masters, m.servantId, { escapePenalty: 0, escapePenaltyDaysLeft: 0 });
      } else {
        // 아직 페널티 유지
        masters = updateMaster(masters, m.servantId, { escapePenaltyDaysLeft: daysLeft });
      }
    }
  }

  // 적대 호감도 배신 이벤트 (15% 확률)
  const playerMasterForBetrayal = masters.find(m => m.isPlayer && m.isAlive);
  if (playerMasterForBetrayal) {
    const betrayalTier = getTier(playerMasterForBetrayal.affection);
    if (betrayalTier === "hostile" && Math.random() < 0.15) {
      const playerServantForBetrayal = state.servantMap[state.playerServantId];
      masters = updateMaster(masters, state.playerServantId, { isAlive: false });
      newLogs.push(log.logBetrayal(state.day, playerServantForBetrayal.name, "마스터", playerServantForBetrayal.id, -1));
      newLogs.push(log.logElimination(state.day, playerServantForBetrayal.name, playerServantForBetrayal.id));
      return {
        ...state,
        masters,
        enemyInfo,
        alliances,
        actionCount: 0,
        phase: "playerDefeated",
        isFinished: true,
        winnerId: null,
        aiTurnResults: newLogs,
        log: [...state.log, ...newLogs],
      };
    }
  }

  // 조용한 밤 체크
  if (newLogs.length === 0) {
    newLogs.push(log.logQuietNight(state.day));
  }

  // 소강 라운드 호감도 +1
  const playerMasterForQuiet = masters.find(m => m.isPlayer && m.isAlive);
  if (playerMasterForQuiet) {
    const quietDelta = affectionFromQuietNight();
    const newAff = clampAffection(playerMasterForQuiet.affection + quietDelta);
    masters = updateMaster(masters, state.playerServantId, { affection: newAff });
  }

  // 야간 상태 메시지 (호감도 / 페널티 기반)
  const playerMasterForStatus = masters.find(m => m.isPlayer && m.isAlive);
  if (playerMasterForStatus) {
    const playerServantForStatus = state.servantMap[state.playerServantId];
    const sName = playerServantForStatus.name;
    const statusTier = getTier(playerMasterForStatus.affection);

    // 페널티 상태 메시지
    if (playerMasterForStatus.escapePenalty > 0) {
      const penaltyMsgs = [
        fixParticles(`${sName}은(는) 패배의 여파로 고통스러워 하고 있다.`),
        fixParticles(`${sName}은(는) 아직 영기 손상을 입은 상태다.`),
        fixParticles(`${sName}의 마력 흐름이 불안정하다. 영핵에 금이 간 것 같다.`),
      ];
      const penaltyMsg = penaltyMsgs[Math.floor(Math.random() * penaltyMsgs.length)];
      newLogs.push({ day: state.day, phase: "status", key: "trpg:log.nightStatus", params: { message: penaltyMsg }, servantRefs: { name: playerServantForStatus.id } });
    }

    // 호감도 상태 메시지 (40% 확률)
    if (Math.random() < 0.4) {
      const affectionStatusMsgs: Partial<Record<typeof statusTier, string[]>> = {
        hostile: [
          fixParticles(`${sName}은(는) 마스터를 적대하고 있다. 조심해야 할 것 같다.`),
          fixParticles(`${sName}의 눈빛에서 경계심이 사라지지 않는다.`),
        ],
        wary: [
          fixParticles(`아직 ${sName}은(는) 마스터를 신뢰하지 못한다.`),
          fixParticles(`${sName}은(는) 마스터와 거리를 유지하고 있다.`),
        ],
        neutral: [
          fixParticles(`${sName}은(는) 마스터와 보통의 관계를 유지하고 있다.`),
        ],
        trusting: [
          fixParticles(`${sName}은(는) 마스터를 신뢰하고 있다.`),
          fixParticles(`${sName}은(는) 마스터의 옆에서 안정적으로 행동하고 있다.`),
        ],
        intimate: [
          fixParticles(`${sName}은(는) 마스터와 깊은 유대를 쌓고 있다.`),
        ],
        devoted: [
          fixParticles(`${sName}은(는) 마스터를 위해서라면 무엇이든 하겠다고 다짐하고 있다.`),
        ],
      };
      const pool = affectionStatusMsgs[statusTier];
      if (pool) {
        const msg = pool[Math.floor(Math.random() * pool.length)];
        newLogs.push({ day: state.day, phase: "status", key: "trpg:log.nightStatus", params: { message: msg }, servantRefs: { name: playerServantForStatus.id } });
      }
    }
  }

  // 마력공급 가능 여부 체크 → 호감도 조건 또는 약화(도주 페널티) 시 manaSupplyPrompt 삽입
  const playerForMana = masters.find(m => m.isPlayer && m.isAlive);
  const manaTier = playerForMana ? getTier(playerForMana.affection) : "neutral";
  const isWeakened = (playerForMana?.escapePenalty ?? 0) > 0;
  const manaUnlocked = playerForMana
    && (manaTier === "trusting" || manaTier === "intimate" || manaTier === "devoted" || isWeakened);

  return {
    ...state,
    masters,
    enemyInfo,
    alliances,
    actionCount: 0,
    phase: manaUnlocked ? "manaSupplyPrompt" : "nightEnd",
    manaSupplyWeaknessReason: isWeakened && !(manaTier === "trusting" || manaTier === "intimate" || manaTier === "devoted"),
    aiTurnResults: newLogs,
    log: [...state.log, ...newLogs],
  };
}

// ─── 마력공급 ───

function handleManaSupply(state: TRPGGameState): TRPGGameState {
  if (state.phase !== "manaSupplyPrompt") return state;

  const playerMaster = getMaster(state, state.playerServantId);
  if (!playerMaster) return { ...state, phase: "nightEnd" };

  const playerServant = state.servantMap[state.playerServantId];
  const personality = getPersonality(playerServant.id, playerServant.class);
  const tier = getTier(playerMaster.affection);

  const outcome = rollManaSupply(personality, tier, playerServant.name, playerServant.id);

  let masters = [...state.masters];
  const newLogs: LogEntry[] = [];

  // 스탯 보너스 (매 공급마다 교체 — 누적 아님)
  masters = updateMaster(masters, state.playerServantId, { manaStatBonus: outcome.statDelta });

  // 호감도 변화
  const newAffection = clampAffection(playerMaster.affection + outcome.affectionDelta);
  masters = updateMaster(masters, state.playerServantId, { affection: newAffection });

  if (outcome.affectionDelta !== 0) {
    newLogs.push(log.logAffectionChange(state.day, playerServant.name, outcome.affectionDelta, playerServant.id));
  }

  // 마력공급 결과 로그
  newLogs.push(log.logManaSupply(state.day, playerServant.name, outcome.result, outcome.narration, playerServant.id));

  const newTierAfterMana = getTier(newAffection);
  const manaAffNotification = outcome.affectionDelta !== 0 ? {
    message: outcome.affectionDelta > 0
      ? fixParticles(`${playerServant.name}은(는) 마력공급에 만족한 듯 하다.`)
      : fixParticles(`${playerServant.name}은(는) 이번 마력공급이 마음에 들지 않은 눈치다.`),
    delta: outcome.affectionDelta,
    tier: newTierAfterMana,
  } : null;

  return {
    ...state,
    masters,
    phase: "manaSupplyResult",
    lastManaSupplyOutcome: outcome,
    lastAffectionNotification: manaAffNotification,
    log: [...state.log, ...newLogs],
  };
}
