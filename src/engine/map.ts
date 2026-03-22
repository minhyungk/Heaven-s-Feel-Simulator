import type { Servant } from "../data/types";
import type { TileId, TilePosition, AreaEffect, MasterState, SkillPrefixes } from "./types";
import { findClassSkillRank } from "./combat";
import {
  RYUUDOU_CASTER_BONUS, FOREST_STEALTH_BONUS, BRIDGE_ENCOUNTER_BONUS,
  CHURCH_COMBAT_REDUCTION, PARK_STEALTH_PENALTY, PARK_ARCHER_BONUS,
} from "./config";

// ─── 3×3 타일맵 정의 ───
// [류도사]────[미야마 주택가]────[학교]
//     │              │               │
//   [숲]────[후유키 대교]────[시가지]
//     │              │               │
//   [항구]────[교회 주변]────[강변공원]

export const TILES: TilePosition[] = [
  { id: "ryuudou",  row: 0, col: 0 },
  { id: "miyama",   row: 0, col: 1 },
  { id: "school",   row: 0, col: 2 },
  { id: "forest",   row: 1, col: 0 },
  { id: "bridge",   row: 1, col: 1 },
  { id: "downtown", row: 1, col: 2 },
  { id: "port",     row: 2, col: 0 },
  { id: "church",   row: 2, col: 1 },
  { id: "park",     row: 2, col: 2 },
];

const TILE_MAP = new Map<TileId, TilePosition>(TILES.map(t => [t.id, t]));

export const TILE_NAMES: Record<string, Record<TileId, string>> = {
  ko: {
    ryuudou: "류도사⛩️", miyama: "미야마 주택가🏘️", school: "학교🏫",
    forest: "숲🌲", bridge: "후유키 대교🌉", downtown: "시가지🏢",
    port: "항구🚢", church: "교회⛪", park: "강변공원🏞️",
  },
  en: {
    ryuudou: "Ryuudou Temple⛩️", miyama: "Miyama District🏘️", school: "School🏫",
    forest: "Forest🌲", bridge: "Fuyuki Bridge🌉", downtown: "Downtown🏢",
    port: "Port🚢", church: "Church⛪", park: "Riverside Park🏞️",
  },
  ja: {
    ryuudou: "柳洞寺⛩️", miyama: "深山町住宅街🏘️", school: "学校🏫",
    forest: "森🌲", bridge: "冬木大橋🌉", downtown: "市街地🏢",
    port: "港🚢", church: "教会⛪", park: "河川敷公園🏞️",
  },
};

export function getTileNames(lang: string): Record<TileId, string> {
  return TILE_NAMES[lang] ?? TILE_NAMES.ko;
}

/** 인접 타일 계산 (상하좌우만) */
export function getAdjacentTiles(tileId: TileId): TileId[] {
  const tile = TILE_MAP.get(tileId);
  if (!tile) return [];
  return TILES
    .filter(t =>
      (Math.abs(t.row - tile.row) === 1 && t.col === tile.col) ||
      (Math.abs(t.col - tile.col) === 1 && t.row === tile.row)
    )
    .map(t => t.id);
}

/** 이동 가능 타일 (기승 시 2타일) */
export function getReachableTiles(
  tileId: TileId,
  servant: Servant,
  prefixes: SkillPrefixes,
): TileId[] {
  const riding = findClassSkillRank(servant, prefixes.riding);
  const adjacent = getAdjacentTiles(tileId);

  if (riding && riding.score >= 5) { // C 이상이면 2타일
    const extended = new Set<TileId>(adjacent);
    for (const adj of adjacent) {
      for (const adj2 of getAdjacentTiles(adj)) {
        if (adj2 !== tileId) extended.add(adj2);
      }
    }
    return Array.from(extended);
  }

  return adjacent;
}

/** 같은 타일로 이동 (제자리) 포함 전체 이동 가능 범위 */
export function getMovablePositions(
  tileId: TileId,
  servant: Servant,
  prefixes: SkillPrefixes,
): TileId[] {
  return [tileId, ...getReachableTiles(tileId, servant, prefixes)];
}

/** 지역 효과 조회 */
export function getAreaEffect(tileId: TileId): AreaEffect {
  switch (tileId) {
    case "ryuudou":
      return { type: "leyline", description: "trpg:area.leyline" };
    case "forest":
    case "port":
      return { type: "stealth", description: "trpg:area.stealth" };
    case "bridge":
      return { type: "encounter", description: "trpg:area.encounter" };
    case "church":
      return { type: "neutral", description: "trpg:area.neutral" };
    case "park":
      return { type: "exposed", description: "trpg:area.exposed" };
    default:
      return { type: "none", description: "" };
  }
}

/** 지역별 전투 보정값 계산 */
export function getAreaCombatBonus(tileId: TileId, servant: Servant): number {
  const effect = getAreaEffect(tileId);
  let bonus = 0;

  if (effect.type === "leyline" && servant.class === "Caster") {
    bonus += RYUUDOU_CASTER_BONUS;
  }
  if (effect.type === "exposed" && servant.class === "Archer") {
    bonus += PARK_ARCHER_BONUS;
  }

  return bonus;
}

/** 지역별 은신 보정값 */
export function getAreaStealthBonus(tileId: TileId): number {
  const effect = getAreaEffect(tileId);
  if (effect.type === "stealth") return FOREST_STEALTH_BONUS;
  if (effect.type === "exposed") return -PARK_STEALTH_PENALTY;
  return 0;
}

/** 지역별 조우 확률 보정 */
export function getAreaEncounterBonus(tileId: TileId): number {
  const effect = getAreaEffect(tileId);
  if (effect.type === "encounter") return BRIDGE_ENCOUNTER_BONUS;
  if (effect.type === "neutral") return -CHURCH_COMBAT_REDUCTION;
  return 0;
}

/** AI 이동 결정 */
export function resolveAIMovement(
  master: MasterState,
  servant: Servant,
  intent: string,
  prefixes: SkillPrefixes,
  occupiedTiles: Map<TileId, number[]>,
): TileId {
  const reachable = getMovablePositions(master.position, servant, prefixes);

  if (intent === "hide") {
    // 은신: 다른 서번트가 없는 타일로 이동, 숲/항구 선호
    const empty = reachable.filter(t => {
      const ids = occupiedTiles.get(t) ?? [];
      return ids.filter(id => id !== master.servantId).length === 0;
    });
    const stealthTiles = (empty.length > 0 ? empty : reachable).filter(t => {
      const e = getAreaEffect(t);
      return e.type === "stealth";
    });
    if (stealthTiles.length > 0) return stealthTiles[Math.floor(Math.random() * stealthTiles.length)];
    if (empty.length > 0) return empty[Math.floor(Math.random() * empty.length)];
  }

  if (intent === "hunt") {
    // 사냥: 적이 있는 타일로 이동
    const occupied = reachable.filter(t => {
      const ids = occupiedTiles.get(t) ?? [];
      return ids.filter(id => id !== master.servantId).length > 0;
    });
    if (occupied.length > 0) return occupied[Math.floor(Math.random() * occupied.length)];
  }

  // 경계 or fallback: 제자리 유지
  return master.position;
}
