import type { EnemyInfo, TileId } from "./types";
import type { ServantClass } from "../data/types";

/** 초기 정보 안개 상태 생성 (TRPG: 적 정보 미공개) */
export function createInitialFog(enemyServantIds: number[]): Record<number, EnemyInfo> {
  const info: Record<number, EnemyInfo> = {};
  for (const id of enemyServantIds) {
    info[id] = {
      servantId: id,
      fogLevel: "unknown",
      knownClass: null,
      knownStats: false,
      knownNP: false,
      lastKnownPosition: null,
    };
  }
  return info;
}

/** Day 7+ 전체 위치 공개 */
export function revealAllPositions(
  enemyInfo: Record<number, EnemyInfo>,
  masters: Array<{ servantId: number; position: TileId; isAlive: boolean; isPlayer: boolean }>,
): Record<number, EnemyInfo> {
  const updated = { ...enemyInfo };
  for (const m of masters) {
    if (m.isPlayer || !m.isAlive) continue;
    if (updated[m.servantId]) {
      updated[m.servantId] = { ...updated[m.servantId], lastKnownPosition: m.position };
    }
  }
  return updated;
}

/** 같은 타일에서 조우 시 정보 공개 (대면 시 스탯까지 공개) */
export function revealOnEncounter(info: EnemyInfo, servantClass: ServantClass, position: TileId): EnemyInfo {
  if (info.fogLevel === "fullyRevealed") return info;
  return {
    ...info,
    fogLevel: "statsRevealed",
    knownClass: servantClass,
    knownStats: true,
    lastKnownPosition: position,
  };
}

/** 교전 시 정보 공개 */
export function revealOnCombat(info: EnemyInfo, servantClass: ServantClass, position: TileId): EnemyInfo {
  return {
    ...info,
    fogLevel: info.fogLevel === "fullyRevealed" ? "fullyRevealed" : "statsRevealed",
    knownClass: servantClass,
    knownStats: true,
    lastKnownPosition: position,
  };
}

/** 보구 사용 시 완전 공개 */
export function revealOnNP(info: EnemyInfo, servantClass: ServantClass, position: TileId): EnemyInfo {
  return {
    ...info,
    fogLevel: "fullyRevealed",
    knownClass: servantClass,
    knownStats: true,
    knownNP: true,
    lastKnownPosition: position,
  };
}

/** AI 교전 정보 전파 (거리 기반) */
export function getDistanceBetween(posA: TileId, posB: TileId): number {
  const coords: Record<TileId, [number, number]> = {
    ryuudou: [0, 0], miyama: [0, 1], school: [0, 2],
    forest: [1, 0], bridge: [1, 1], downtown: [1, 2],
    port: [2, 0], church: [2, 1], park: [2, 2],
  };
  const [r1, c1] = coords[posA];
  const [r2, c2] = coords[posB];
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/** AI 교전 결과를 바탕으로 플레이어 정보 갱신 */
export function updateFogFromAICombat(
  enemyInfo: Record<number, EnemyInfo>,
  combatantAId: number,
  combatantBId: number,
  combatPosition: TileId,
  playerPosition: TileId,
  combatantAClass: ServantClass,
  combatantBClass: ServantClass,
): Record<number, EnemyInfo> {
  const distance = getDistanceBetween(playerPosition, combatPosition);
  const updated = { ...enemyInfo };

  const updateForCombatant = (id: number, cls: ServantClass) => {
    if (!updated[id]) return;
    if (distance === 0) {
      // 같은 타일: 전체 공개
      updated[id] = revealOnCombat(updated[id], cls, combatPosition);
    } else if (distance === 1) {
      // 인접: 교전음 → 클래스만 공개 (스탯/이미지는 직접 조우 전까지 비공개)
      if (updated[id].fogLevel === "unknown") {
        updated[id] = { ...updated[id], fogLevel: "classRevealed", knownClass: cls, lastKnownPosition: combatPosition };
      } else if (updated[id].fogLevel === "classRevealed") {
        updated[id] = { ...updated[id], knownClass: cls, lastKnownPosition: combatPosition };
      }
    } else {
      // 2타일+: 마력 파동만 (위치 불명)
      if (updated[id].fogLevel === "unknown") {
        updated[id] = { ...updated[id], fogLevel: "unknown" };
      }
    }
  };

  updateForCombatant(combatantAId, combatantAClass);
  updateForCombatant(combatantBId, combatantBClass);

  return updated;
}
