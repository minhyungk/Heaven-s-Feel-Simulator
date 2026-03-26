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
  affectionFromAction, affectionFromBattle,
  affectionFromQuietNight, getRefusalOverrideIntent,
} from "./affection";
import { rollManaSupply } from "./manaSupply";
import { processServantSkills, getPassiveModifiers, getSkillWinRateBonus } from "./activeSkills";
// alliance module — placeholder, 추후 활성화
// import { rollAllianceFormation, checkBetrayal, areAllied, removeFromAlliances } from "./alliance";
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
    affection: s.id === playerServantId
      ? getInitialAffection(s.id, s.class, isCatalystSummon)
      : 50, // AI 서번트는 호감도 미사용, 기본값
  }));

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
      // 7일차+ 도주 불가 → 즉시 게임오버
      masters = updateMaster(masters, state.playerServantId, { isAlive: false });
      newLogs.push(log.logElimination(state.day, playerServant.name, playerServant.id));
      return {
        ...state,
        ...extraState,
        masters,
        enemyInfo,
        currentEncounter: null,
        lastCombatResult: result,
        pendingEnemySeal: null,
        phase: "gameOver",
        isFinished: true,
        winnerId: null,
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
    if (madResult.disobeyed) {
      newLogs.push(log.logMadDisobey(state.day, playerServant.name, intent, finalIntent, playerServant.id));
    }
  }

  // 행동 선호에 따른 호감도 변화
  const personality = getPersonality(playerServant.id, playerServant.class);
  const affDelta = affectionFromAction(intent, personality);
  if (affDelta !== 0) {
    const newAffection = clampAffection(playerMaster.affection + affDelta);
    masters = updateMaster(masters, state.playerServantId, { affection: newAffection });
    newLogs.push(log.logAffectionChange(state.day, playerServant.name, affDelta, playerServant.id));
  }

  // 7일차 첫 행동만 강제 집합 안내 (8일차+는 생략)
  const nextPhase = (state.day === FORCED_HUNT_DAY && state.actionCount === 0)
    ? "forcedBridgeNotice" as const
    : "movementSelection" as const;

  return {
    ...state,
    masters,
    phase: nextPhase,
    playerIntent: finalIntent,
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

    // 정보 안개 갱신
    let enemyInfo = { ...state.enemyInfo };
    if (enemyInfo[enemy.servantId]) {
      enemyInfo[enemy.servantId] = revealOnEncounter(enemyInfo[enemy.servantId], enemyServant.class, finalTarget);
    }

    const newLogs: LogEntry[] = [];
    if (isAmbush) {
      newLogs.push(log.logAmbushDetection(state.day, enemyServant.name, playerServant.id));
    }

    return {
      ...state,
      masters,
      playerMoveTarget: finalTarget,
      enemyInfo,
      currentEncounter: { enemyId: enemy.servantId, canEscape: true, isAmbush },
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
      let enemyInfo = { ...state.enemyInfo };
      if (enemyInfo[enemy.servantId]) {
        enemyInfo[enemy.servantId] = revealOnEncounter(enemyInfo[enemy.servantId], enemyServant.class, finalTarget);
      }

      const newLogs = [log.logPlayerDetected(state.day, enemyServant.name, enemyServant.id)];

      return {
        ...state,
        masters,
        playerMoveTarget: finalTarget,
        enemyInfo,
        currentEncounter: { enemyId: enemy.servantId, canEscape: true },
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

  if (!fight) {
    // 7일차 이후 도주 불가
    if (state.day >= FORCED_HUNT_DAY) {
      // 도주 불가 → 강제 전투
    } else {
      // 도주 시도
      const escapeResult = attemptEscape(playerServant, enemyServant, prefixes);
      const newLogs = [log.logEscape(state.day, playerServant.name, escapeResult.success, playerServant.id)];

      if (escapeResult.success) {
        return {
          ...state,
          currentEncounter: null,
          phase: "playerEscaped",
          log: [...state.log, ...newLogs],
        };
      }
      // 도주 실패 → 강제 전투
    }
  }

  // AI 영주 사용 판단 (#10)
  const enemySeal = decideAISealUse(enemyMaster, enemyServant, playerServant, prefixes);
  if (enemySeal && enemySeal !== "escape") {
    // 적 AI가 영주를 사용하려 한다 → 카운터 프롬프트
    return {
      ...state,
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
      ...state,
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
    scorePenaltyA: playerMaster.escapePenalty,
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

  // 정보 공개
  let enemyInfo = { ...state.enemyInfo };
  if (enemyInfo[enemyId]) {
    enemyInfo[enemyId] = revealOnCombat(enemyInfo[enemyId], enemyServant.class, playerMaster.position);
  }

  return processCombatOutcome(state, result, masters2, enemyInfo, newLogs2);
}

function handleUseCommandSeal(state: TRPGGameState, sealType: string, prefixes: SkillPrefixes): TRPGGameState {
  const playerMaster = getMaster(state, state.playerServantId)!;
  if (playerMaster.commandSeals <= 0) return state;

  const newLogs = [log.logCommandSeal(state.day, sealType)];
  let masters = updateMaster(state.masters, state.playerServantId, {
    commandSeals: playerMaster.commandSeals - 1,
  });

  if (sealType === "escape" && state.currentEncounter) {
    // 7일차 이후 도주 불가
    if (state.day >= FORCED_HUNT_DAY) return state;
    // 강제 도주
    newLogs.push(log.logSealEscape(state.day, state.servantMap[state.playerServantId].name, state.playerServantId));
    return {
      ...state,
      masters,
      currentEncounter: null,
      escapedViaSeal: true,
      phase: "playerEscaped",
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
        scorePenaltyA: playerMaster.escapePenalty,
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
        scorePenaltyA: playerMaster.escapePenalty,
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
    scorePenaltyA: playerMaster.escapePenalty,
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

  // 7일차 이후 도주 불가 → 즉시 패배
  if (state.day >= FORCED_HUNT_DAY) {
    masters = updateMaster(masters, state.playerServantId, { isAlive: false });
    newLogs.push(log.logElimination(state.day, playerServant.name, playerServant.id));
    return {
      ...state,
      masters,
      currentEncounter: null,
      phase: "gameOver",
      isFinished: true,
      winnerId: null,
      log: [...state.log, ...newLogs],
    };
  }

  if (useSeal && playerMaster.commandSeals > 0) {
    // 영주 사용 확정 도주
    masters = updateMaster(masters, state.playerServantId, { commandSeals: playerMaster.commandSeals - 1, escapePenalty: ESCAPE_STAT_PENALTY });
    newLogs.push(log.logCommandSeal(state.day, "escape"));
    newLogs.push(log.logSealEscape(state.day, playerServant.name, playerServant.id));
    return {
      ...state,
      masters,
      currentEncounter: null,
      lastCombatResult: null,
      escapedViaSeal: true,
      phase: "playerEscaped",
      log: [...state.log, ...newLogs],
    };
  }

  // 일반 도주 시도
  const escapeResult = attemptEscape(playerServant, enemyServant, prefixes);
  newLogs.push(log.logEscape(state.day, playerServant.name, escapeResult.success, playerServant.id));

  if (escapeResult.success) {
    masters = updateMaster(masters, state.playerServantId, { escapePenalty: ESCAPE_STAT_PENALTY });
    return {
      ...state,
      masters,
      currentEncounter: null,
      lastCombatResult: null,
      phase: "playerEscaped",
      log: [...state.log, ...newLogs],
    };
  }

  // 도주 실패 → 진짜 패배 → 즉시 게임 오버
  masters = updateMaster(masters, state.playerServantId, { isAlive: false });
  newLogs.push(log.logElimination(state.day, playerServant.name, playerServant.id));

  return {
    ...state,
    masters,
    currentEncounter: null,
    phase: "gameOver",
    isFinished: true,
    winnerId: null,
    log: [...state.log, ...newLogs],
  };
}

function handleAdvancePhase(state: TRPGGameState, _prefixes: SkillPrefixes): TRPGGameState {
  if (state.phase === "forcedBridgeNotice") {
    return { ...state, phase: "movementSelection" };
  }
  if (state.phase === "combatResult") {
    // 전투 후 승리 조건 체크 → 게임 종료 or 계속
    if (state.isFinished) {
      return { ...state, phase: getGameEndPhase(state, state.winnerId), lastCombatResult: null };
    }
    return { ...state, phase: "aiTurn", lastCombatResult: null };
  }
  if (state.phase === "playerEscaped") {
    return { ...state, escapedViaSeal: false, phase: "aiTurn" };
  }
  if (state.phase === "enemyEscaped") {
    return { ...state, escapedEnemyId: null, escapedViaSeal: false, phase: "aiTurn" };
  }
  if (state.phase === "manaSupplyResult") {
    return { ...state, phase: "nightEnd" };
  }
  if (state.phase === "grailWish") {
    return { ...state, phase: "gameOver" };
  }
  // 플레이어 사망 시 즉시 게임 오버이므로 여기 도달 안 함
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
    return { ...state, day: nextDay, phase: "intentSelection", aiTurnResults: [], playerIntent: null, playerMoveTarget: null, actionCount: 0, enemyInfo };
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

    // 광화 체크 (#11: AI는 클래스명 사용)
    const madResult = checkMadEnhancement(servant, intent, prefixes);
    if (madResult.disobeyed) {
      intent = madResult.overriddenIntent;
      newLogs.push(log.logMadDisobey(state.day, servant.name, madResult.originalIntent, intent, servant.id, servant.class));
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
      const sealA = decideAISealUse(mA, sA, sB, prefixes);
      const sealB = decideAISealUse(mB, sB, sA, prefixes);

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

  // 도주 페널티 회복 (밤이 바뀔 때 리셋)
  for (const m of masters) {
    if (m.isAlive && m.escapePenalty > 0) {
      if (m.isPlayer) {
        const servant = state.servantMap[m.servantId];
        newLogs.push(log.logEscapeRecovery(state.day, servant.name, servant.id));
      }
      masters = updateMaster(masters, m.servantId, { escapePenalty: 0 });
    }
  }

  // 조용한 밤 체크
  if (newLogs.length === 0) {
    newLogs.push(log.logQuietNight(state.day));
  }

  // 소강 라운드 호감도 +1
  const playerMasterForQuiet = masters.find(m => m.isPlayer);
  if (playerMasterForQuiet && playerMasterForQuiet.isAlive) {
    const quietDelta = affectionFromQuietNight();
    const newAff = clampAffection(playerMasterForQuiet.affection + quietDelta);
    masters = updateMaster(masters, state.playerServantId, { affection: newAff });
  }

  // 마력공급 가능 여부 체크 → manaSupplyPrompt 삽입
  const playerForMana = masters.find(m => m.isPlayer);
  const manaUnlocked = playerForMana && playerForMana.isAlive && getTier(playerForMana.affection) !== "hostile" && getTier(playerForMana.affection) !== "wary" && getTier(playerForMana.affection) !== "neutral";

  return {
    ...state,
    masters,
    enemyInfo,
    alliances,
    actionCount: 0,
    phase: manaUnlocked ? "manaSupplyPrompt" : "nightEnd",
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

  // 호감도 변화
  const newAffection = clampAffection(playerMaster.affection + outcome.affectionDelta);
  masters = updateMaster(masters, state.playerServantId, { affection: newAffection });

  if (outcome.affectionDelta !== 0) {
    newLogs.push(log.logAffectionChange(state.day, playerServant.name, outcome.affectionDelta, playerServant.id));
  }

  // 마력공급 결과 로그
  newLogs.push(log.logManaSupply(state.day, playerServant.name, outcome.result, outcome.narration, playerServant.id));

  return {
    ...state,
    masters,
    phase: "manaSupplyResult",
    lastManaSupplyOutcome: outcome,
    log: [...state.log, ...newLogs],
  };
}
