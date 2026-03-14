// ─── 전투 시뮬레이션 밸런스 설정 ───
// 이 파일의 값을 수정하면 전투 판정이 변경됩니다.

/** 엑스트라 클래스 난입 확률 (0~1) */
export const EXTRA_INVASION_CHANCE = 0.15;

/** 난입 시 플레이어 슬롯 대체 가중치 (다른 슬롯은 1) */
export const EXTRA_INVASION_PLAYER_WEIGHT = 2;

/** 어새신 기습: 기척차단 랭크 기반 기습 최대 확률 (0~1) */
export const AMBUSH_MAX_CHANCE = 0.30;

/** 어새신 기습: 성공 시 승률 보정 (0~1) */
export const AMBUSH_WIN_BONUS = 0.20;

/** 대마력: 3기사 vs 캐스터 최대 승률 보정 (0~1) */
export const ANTI_MAGIC_MAX_BONUS = 0.40;

/** 경계 vs 사냥: 경계 측 승률 보정 (0~1) */
export const GUARD_DEFENSE_BONUS = 0.10;

/** 무승부 판정: 승률 차이 임계값 (50% ± 이 값 이내면 무승부 대상) */
export const DRAW_THRESHOLD = 0.10;

/** 무승부 확률: [일차 범위 끝, 확률] */
export const DRAW_CHANCES: [number, number][] = [
  [2, 0.30],  // 1~2일차
  [4, 0.20],  // 3~4일차
  [6, 0.10],  // 5~6일차
  // 7일차+: 0%
];

/** 강제 사냥(전투) 시작 일차 */
export const FORCED_HUNT_DAY = 7;
