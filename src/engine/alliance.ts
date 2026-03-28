import type { MasterState } from "./types";

// ─── 타입 ───

export interface Alliance {
  servantIds: [number, number];
  formedOnDay: number;
  betrayalChance: number; // 매일 증가
}

// ─── 동맹 결성 ───

const BASE_ALLIANCE_CHANCE = 0.12; // 12% per eligible pair per night

export function rollAllianceFormation(
  aliveMasters: MasterState[],
  day: number,
  existingAlliances: Alliance[],
): Alliance | null {
  // 이미 동맹 중인 서번트 제외
  const alliedIds = new Set(existingAlliances.flatMap(a => a.servantIds));
  const eligible = aliveMasters.filter(m => !m.isPlayer && !alliedIds.has(m.servantId));

  if (eligible.length < 2) return null;
  if (Math.random() > BASE_ALLIANCE_CHANCE) return null;

  // 랜덤 2명 선택
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const pair: [number, number] = [shuffled[0].servantId, shuffled[1].servantId];

  return {
    servantIds: pair,
    formedOnDay: day,
    betrayalChance: 0.15, // 초기 배신 확률 15%
  };
}

// ─── 배신 체크 ───

const BETRAYAL_INCREASE_PER_DAY = 0.10; // 매일 10% 증가

export function checkBetrayal(alliance: Alliance, currentDay: number): {
  betrayed: boolean;
  betrayerId: number;
  victimId: number;
} | null {
  const daysSinceFormed = currentDay - alliance.formedOnDay;
  const currentChance = alliance.betrayalChance + (daysSinceFormed * BETRAYAL_INCREASE_PER_DAY);

  if (Math.random() > currentChance) return null;

  // 랜덤으로 배신자 선택
  const betrayerIdx = Math.random() < 0.5 ? 0 : 1;
  return {
    betrayed: true,
    betrayerId: alliance.servantIds[betrayerIdx],
    victimId: alliance.servantIds[1 - betrayerIdx],
  };
}

// ─── 동맹 효과 ───

/** 동맹 중인 서번트 쌍인지 확인 */
export function areAllied(alliances: Alliance[], idA: number, idB: number): boolean {
  return alliances.some(a =>
    (a.servantIds[0] === idA && a.servantIds[1] === idB) ||
    (a.servantIds[0] === idB && a.servantIds[1] === idA)
  );
}

/** 배신 시 기습 보정 */
export const BETRAYAL_AMBUSH_BONUS = 0.25;

/** 동맹에서 서번트 제거 (사망/배신 시) */
export function removeFromAlliances(alliances: Alliance[], servantId: number): Alliance[] {
  return alliances.filter(a => !a.servantIds.includes(servantId));
}
