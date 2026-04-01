/**
 * 성배전쟁 회고록 — 로그에서 핵심 마일스톤을 추출
 */
import type { TRPGGameState, LogEntry } from "./types";

export type MilestoneType =
  | "firstEncounter"
  | "victory"
  | "defeat"
  | "draw"
  | "npDeploy"
  | "elimination"
  | "sealUse"
  | "sealEscape"
  | "manaSupply"
  | "alliance"
  | "betrayal"
  | "quietNight"
  | "escape"
  | "commandRefusal";

export interface Milestone {
  type: MilestoneType;
  day: number;
  importance: number;
  servantRefs: Record<string, number>;
  params: Record<string, string>;
}

// ─── 로그 키 → 마일스톤 분류 ───

interface Classification {
  type: MilestoneType;
  baseImportance: number;
}

function classify(log: LogEntry, playerId: number): Classification | null {
  const refs = log.servantRefs ?? {};
  const isPlayerInvolved =
    Object.values(refs).includes(playerId);

  switch (log.key) {
    case "trpg:log.victory": {
      const isPlayerWinner = refs.winner === playerId;
      const isPlayerLoser = refs.loser === playerId;
      if (isPlayerWinner) return { type: "victory", baseImportance: 5 };
      if (isPlayerLoser) return { type: "defeat", baseImportance: 5 };
      // AI끼리의 전투는 낮은 중요도로 elimination에서 커버
      return null;
    }
    case "trpg:log.draw":
      return isPlayerInvolved ? { type: "draw", baseImportance: 3 } : null;
    case "trpg:log.npDeploy":
      return { type: "npDeploy", baseImportance: isPlayerInvolved ? 8 : 4 };
    case "trpg:log.elimination":
      return { type: "elimination", baseImportance: isPlayerInvolved ? 7 : 5 };
    case "trpg:log.commandSeal":
      // escape 타입은 sealEscape 마일스톤으로 커버 → 이중 카운트 방지
      if (log.params.type === "escape") return null;
      return { type: "sealUse", baseImportance: 5 };
    case "trpg:log.commandSealWithClass":
      // className 포함 = 적/AI 영주 → 회고록에서 제외
      return null;
    case "trpg:log.sealEscape":
      return isPlayerInvolved ? { type: "sealEscape", baseImportance: 7 } : null;
    case "trpg:log.escapeSuccess":
      return isPlayerInvolved ? { type: "escape", baseImportance: 4 } : null;
    case "trpg:log.manaSupply":
      return { type: "manaSupply", baseImportance: 3 };
    case "trpg:log.allianceFormed":
      return isPlayerInvolved ? { type: "alliance", baseImportance: 5 } : null;
    case "trpg:log.betrayal":
      return { type: "betrayal", baseImportance: 8 };
    case "trpg:log.quietNight":
      return { type: "quietNight", baseImportance: 1 };
    case "trpg:log.commandRefusal":
      return isPlayerInvolved ? { type: "commandRefusal", baseImportance: 4 } : null;
    default:
      return null;
  }
}

// ─── 메인 추출 ───

const MAX_MILESTONES = 14;
const MIN_MILESTONES = 3;
const MAX_QUIET_NIGHTS = 1;

export function extractMilestones(state: TRPGGameState): Milestone[] {
  const playerId = state.playerServantId;
  const finalDay = state.day;
  const raw: Milestone[] = [];
  let quietCount = 0;
  let firstPlayerCombatFound = false;

  for (const log of state.log) {
    const c = classify(log, playerId);
    if (!c) continue;

    // 고요한 밤 제한
    if (c.type === "quietNight") {
      if (quietCount >= MAX_QUIET_NIGHTS) continue;
      quietCount++;
    }

    let importance = c.baseImportance;

    // 첫날/마지막날 보정
    if (log.day === 1) importance += 1;
    if (log.day === finalDay) importance += 2;

    // 첫 전투 마크
    let type = c.type;
    if (!firstPlayerCombatFound && (type === "victory" || type === "defeat" || type === "draw")) {
      type = "firstEncounter";
      importance += 2;
      firstPlayerCombatFound = true;
    }

    raw.push({
      type,
      day: log.day,
      importance,
      servantRefs: log.servantRefs ?? {},
      params: log.params,
    });
  }

  // 중요도 순 정렬 후 상위 N개 선택
  raw.sort((a, b) => b.importance - a.importance);
  const selected = raw.slice(0, MAX_MILESTONES);

  // 최소 보장 (짧은 게임 대응)
  while (selected.length < MIN_MILESTONES) {
    selected.push({
      type: "quietNight",
      day: Math.min(selected.length + 1, finalDay),
      importance: 0,
      servantRefs: {},
      params: {},
    });
  }

  // 시간순 재정렬
  selected.sort((a, b) => a.day - b.day || a.importance - b.importance);

  return selected;
}
