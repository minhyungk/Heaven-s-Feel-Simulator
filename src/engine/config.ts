// ─── 통합 설정: 기존 simulation/config.ts + TRPG 파라미터 ───

// ─── 기존 전투 시뮬레이션 밸런스 ───
export const EXTRA_INVASION_CHANCE = 0.15;
export const EXTRA_INVASION_PLAYER_WEIGHT = 2;
export const AMBUSH_MAX_CHANCE = 0.30;
export const AMBUSH_WIN_BONUS = 0.20;
export const ANTI_MAGIC_MAX_BONUS = 0.40;
export const GUARD_DEFENSE_BONUS = 0.10;
export const DRAW_THRESHOLD = 0.10;
export const DRAW_CHANCES: [number, number][] = [
  [2, 0.30],
  [4, 0.20],
  [6, 0.10],
];
export const FORCED_HUNT_DAY = 7;

// ─── TRPG 확장 파라미터 ───

/** 전투력 랜덤 변동 범위 (±) */
export const COMBAT_VARIANCE = 0.175;

/** 도주 기본 확률 */
export const ESCAPE_BASE = 0.50;

/** 기승 도주 보너스 */
export const RIDING_ESCAPE_BONUS = 0.15;

/** 기척차단 도주 보너스 */
export const CONCEALMENT_ESCAPE_BONUS = 0.10;

/** 영주 초기 개수 */
export const COMMAND_SEAL_COUNT = 3;

/** 영주 전투력 부스트 배율 */
export const SEAL_BOOST_MULTIPLIER = 1.3;

/** 보구 풀파워 배율 */
export const NP_FULL_POWER_MULTIPLIER = 2.0;

/** 은신 발각 기본 확률 (경계 상태) */
export const DETECTION_BASE_GUARD = 0.25;

/** 은신 발각 기본 확률 (사냥 상태) */
export const DETECTION_BASE_HUNT = 0.10;

/** 어쌔신 은신 보너스 */
export const ASSASSIN_STEALTH_BONUS = 0.10;

/** 은신 발각 패널티 (전투 시) */
export const DETECTED_PENALTY = 0.15;

/** 광화 랭크별 명령 무시 확률 */
export const MAD_DISOBEY_CHANCES: Record<string, number> = {
  "E-": 0.05,
  "E": 0.10,
  "E+": 0.12,
  "D-": 0.12,
  "D": 0.15,
  "D+": 0.18,
  "C-": 0.18,
  "C": 0.25,
  "C+": 0.28,
  "B-": 0.28,
  "B": 0.35,
  "B+": 0.38,
  "A-": 0.38,
  "A": 0.45,
  "A+": 0.50,
  "A++": 0.55,
  "EX": 0.0,
};

/** 진지작성 전투력 보너스 (동일 타일 2+ 라운드) */
export const TERRITORY_CREATION_BONUS = 0.20;

/** 도구작성 랜덤 스탯 부스트 랭크 수 */
export const ITEM_CONSTRUCTION_BOOST_RANKS = 1;

/** 기승 이동 타일 수 */
export const RIDING_MOVE_TILES = 2;

/** 단독행동 잔존 일수 (랭크별) */
export const INDEPENDENT_ACTION_DAYS: Record<string, number> = {
  "E": 1,
  "D": 1,
  "C": 1,
  "B": 2,
  "A": 3,
  "A+": 3,
  "A++": 3,
  "EX": 3,
};

/** 단독행동 잔존 시 스탯 다운 랭크 */
export const INDEPENDENT_ACTION_STAT_PENALTY = 10;

/** 단독현현 추가 잔존 일수 */
export const INDEPENDENT_MANIFESTATION_EXTRA_DAYS = 1;

/** 단독현현 스탯 다운 감소 */
export const INDEPENDENT_MANIFESTATION_PENALTY_REDUCTION = 0.5;

/** 후반 보정: [일차 범위 끝, 발각 추가 확률] */
export const LATE_GAME_DETECTION_BONUS: [number, number][] = [
  [2, 0.00],
  [4, 0.05],
  [6, 0.10],
];
/** 7일차+ 발각 추가 확률 */
export const LATE_GAME_DETECTION_FALLBACK = 0.20;

/** AI 영주 사용 패배 확률 임계값 */
export const AI_SEAL_LOSE_THRESHOLD = 0.70;

/** 교회 주변 전투 확률 감소 */
export const CHURCH_COMBAT_REDUCTION = 0.30;

/** 류도사 캐스터 진지작성 보너스 */
export const RYUUDOU_CASTER_BONUS = 0.15;

/** 숲/항구 은신 보너스 */
export const FOREST_STEALTH_BONUS = 0.10;

/** 후유키 대교 조우 확률 상승 */
export const BRIDGE_ENCOUNTER_BONUS = 0.15;

/** 강변공원 은신 페널티 */
export const PARK_STEALTH_PENALTY = 0.05;

/** 강변공원 Archer 보너스 */
export const PARK_ARCHER_BONUS = 0.05;

/** 도주 시 다음 전투 스탯 페널티 */
export const ESCAPE_STAT_PENALTY = 3;
