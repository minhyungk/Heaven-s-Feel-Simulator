import type { Servant, ServantClass } from "../data/types";
import type { AffectionTier } from "./affection";

// ─── 기본 타입 (enum 금지, union만 사용) ───

export type Intent = "hunt" | "guard" | "hide";

export type TileId =
  | "ryuudou" | "miyama" | "school"
  | "forest" | "bridge" | "downtown"
  | "port" | "church" | "park";

export type CommandSealType = "boost" | "escape" | "npFullPower" | "madControl";

export type TRPGPhase =
  | "intentSelection"
  | "movementSelection"
  | "encounterCheck"
  | "encounterDecision"
  | "counterSealPrompt"
  | "defeatEscapePrompt"
  | "playerEscaped"
  | "playerDefeated"
  | "enemyEscaped"
  | "combat"
  | "combatResult"
  | "forcedBridgeNotice"
  | "aiTurn"
  | "manaSupplyPrompt"
  | "manaSupplyResult"
  | "nightEnd"
  | "grailWish"
  | "gameOver";

export type FogLevel = "unknown" | "classRevealed" | "statsRevealed" | "fullyRevealed";

// ─── 스킬 프리픽스 ───

export interface SkillPrefixes {
  presenceConcealment: string;
  magicResistance: string;
  itemConstruction: string;
  territoryCreation: string;
  riding: string;
  independentAction: string;
  independentManifestation: string;
  presenceDetection: string;
  madEnhancement: string;
  divinity: string;
}

// ─── 전투 관련 ───

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

// ─── 맵 관련 ───

export interface TilePosition {
  id: TileId;
  row: number;
  col: number;
}

export type AreaEffectType =
  | "leyline"      // 류도사: 캐스터 진지작성 보너스
  | "stealth"      // 숲/항구: 은신 보너스
  | "encounter"    // 후유키 대교: 조우 확률 상승
  | "neutral"      // 교회: 전투 확률 감소
  | "exposed"      // 강변공원: 은신 페널티
  | "none";

export interface AreaEffect {
  type: AreaEffectType;
  description: string;
}

// ─── 마스터/서번트 TRPG 상태 ───

export interface MasterState {
  servantId: number;
  commandSeals: number;
  isPlayer: boolean;
  isAlive: boolean;
  /** 단독행동 잔존 일수 (0이면 비활성) */
  independentActionDays: number;
  /** 단독행동 시 스탯 페널티 랭크 */
  statPenalty: number;
  /** 현재 위치 */
  position: TileId;
  /** 같은 타일 체류 라운드 수 (진지작성용) */
  stayDuration: number;
  /** 도구작성 누적 부스트 */
  itemBoostCount: number;
  /** 도주 페널티 (전투 스탯 감소) */
  escapePenalty: number;
  /** 도주 페널티 잔여 밤 수 (2→1→0에서 리셋) */
  escapePenaltyDaysLeft: number;
  /** 마력공급 스탯 보너스 (매 공급마다 갱신) */
  manaStatBonus: number;
  /** 호감도 (0~100) */
  affection: number;
}

export interface EnemyInfo {
  servantId: number;
  fogLevel: FogLevel;
  knownClass: ServantClass | null;
  knownStats: boolean;
  knownNP: boolean;
  lastKnownPosition: TileId | null;
}

// ─── 로그 ───

export interface LogEntry {
  day: number;
  phase: string;
  key: string;
  params: Record<string, string>;
  servantRefs?: Record<string, number>;
}

// ─── TRPG 게임 상태 ───

export interface TRPGGameState {
  day: number;
  phase: TRPGPhase;
  masters: MasterState[];
  /** 서번트 ID → 서번트 데이터 */
  servantMap: Record<number, Servant>;
  /** 플레이어 서번트 ID */
  playerServantId: number;
  /** 적 정보 (정보 안개) */
  enemyInfo: Record<number, EnemyInfo>;
  /** 현재 조우 대상 */
  currentEncounter: {
    enemyId: number;
    canEscape: boolean;
    /** 은신 발각에 의한 기습 조우 */
    isAmbush?: boolean;
    /** 조우 의도 매칭 (조우 서사 생성용) */
    intentMatchup?: "hunt_hunt" | "hunt_guard" | "ambush" | "detected";
  } | null;
  /** 마지막 전투 결과 */
  lastCombatResult: CombatResult | null;
  /** 전쟁 로그 */
  log: LogEntry[];
  /** 전쟁 종료 여부 */
  isFinished: boolean;
  /** 승자 ID */
  winnerId: number | null;
  /** AI 턴 결과 (표시용) */
  aiTurnResults: LogEntry[];
  /** 현재 선택한 의도 (플레이어) */
  playerIntent: Intent | null;
  /** 현재 선택한 이동 목표 */
  playerMoveTarget: TileId | null;
  /** 적 AI가 영주 사용을 결정했을 때 (카운터 프롬프트용) */
  pendingEnemySeal: CommandSealType | null;
  /** 도주한 적 서번트 ID (표시용) */
  escapedEnemyId: number | null;
  /** 적이 영주를 사용하여 도주했는지 여부 */
  escapedViaSeal: boolean;
  /** 소원 (성배전쟁 승리 시) */
  wish: string | null;
  /** 현재 밤의 행동 횟수 (0-based, 최대 2회) */
  actionCount: number;
  /** 동맹 목록 */
  alliances: { servantIds: [number, number]; formedOnDay: number; betrayalChance: number }[];
  /** 마지막 마력공급 결과 */
  lastManaSupplyOutcome: {
    result: string;
    statDelta: number;
    affectionDelta: number;
    narration: string;
  } | null;
  /** 호감도 변화 알림 (패널에 표시, intentSelection 진입 시 초기화) */
  lastAffectionNotification: {
    message: string;
    delta: number;
    tier: AffectionTier;
  } | null;
  /** 마력공급이 약화(escape 패널티) 이유로 발생했는지 여부 */
  manaSupplyWeaknessReason: boolean;
  /** 후유키 대교 강제 소환 메시지 표시 여부 (1회만) */
  forcedBridgeShown: boolean;
}

// ─── TRPG 액션 ───

export type TRPGAction =
  | { type: "selectIntent"; intent: Intent }
  | { type: "selectMovement"; target: TileId }
  | { type: "encounterDecision"; fight: boolean }
  | { type: "useCommandSeal"; sealType: CommandSealType }
  | { type: "counterSealDecision"; useSeal: CommandSealType | null }
  | { type: "defeatEscapeDecision"; useSeal: boolean }
  | { type: "setWish"; wish: string }
  | { type: "advancePhase" }
  | { type: "resolveAI" }
  | { type: "manaSupply" }
  | { type: "skipManaSupply" };

// ─── 기존 warEngine 호환 타입 ───

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

export interface WarSimulationResult {
  rounds: RoundResult[];
  winner: Servant | null;
  totalDays: number;
}
