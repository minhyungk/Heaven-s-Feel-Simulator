/**
 * 성배전쟁 회고록 — 마일스톤 → NarrativeLine[] 생성
 */
import type { TRPGGameState } from "./types";
import type { NarrativeLine, NarrativeEffect, NarrativeSpeed } from "./narrativeFormatter";
import type { Milestone } from "./memoirExtractor";
import { extractMilestones } from "./memoirExtractor";
import { getMemoirTemplates } from "../data/memoirTemplates";
import { getTier } from "./affection";
import { fillTemplate } from "./narrativeGenerator";

// ─── 이펙트 매핑 ───

const EFFECT_MAP: Record<string, { effect: NarrativeEffect; speed: NarrativeSpeed }> = {
  firstEncounter: { effect: "normal", speed: "fast" },
  victory:        { effect: "normal", speed: "fast" },
  defeat:         { effect: "critical", speed: "fast" },
  draw:           { effect: "draw", speed: "fast" },
  npDeploy:       { effect: "normal", speed: "fast" },
  elimination:    { effect: "elimination", speed: "fast" },
  sealUse:        { effect: "normal", speed: "fast" },
  sealEscape:     { effect: "normal", speed: "fast" },
  escape:         { effect: "stealth_fade", speed: "fast" },
  alliance:       { effect: "normal", speed: "fast" },
  betrayal:       { effect: "critical", speed: "fast" },
  quietNight:     { effect: "stealth_fade", speed: "fast" },
  manaSupply:     { effect: "servant_dialogue", speed: "fast" },
  commandRefusal: { effect: "critical", speed: "fast" },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeLine(text: string, effect: NarrativeEffect, speed: NarrativeSpeed, delay: number): NarrativeLine {
  return { text, effect, speed, delay };
}

// ─── 마일스톤에서 서번트 이름 추출 ───

const SEAL_ORDINALS = ["첫 번째", "두 번째", "세 번째"] as const;

function resolveNames(
  milestone: Milestone,
  state: TRPGGameState,
): { A: string; B: string; 보구명: string; sealOrd: string } {
  const playerServant = state.servantMap[state.playerServantId];
  const A = playerServant?.name ?? "";

  // B = 상대 서번트 (winner/loser, name, attacker/target 등에서 추출)
  let B = "";
  const refs = milestone.servantRefs;
  const params = milestone.params;

  // opponentName (영주 로그에 포함된 상대 이름)
  if (params.opponentName) {
    B = params.opponentName;
  }

  // servantRefs에서 플레이어가 아닌 쪽 찾기
  if (!B) {
    for (const [key, id] of Object.entries(refs)) {
      if (id !== state.playerServantId && state.servantMap[id]) {
        B = state.servantMap[id].name;
        break;
      }
      // winner/loser에서 플레이어가 아닌 쪽
      if (key === "winner" && id !== state.playerServantId) {
        B = state.servantMap[id]?.name ?? params.winner ?? "";
      }
      if (key === "loser" && id !== state.playerServantId) {
        B = state.servantMap[id]?.name ?? params.loser ?? "";
      }
    }
  }

  // params fallback
  if (!B) {
    B = params.loser ?? params.winner ?? params.name ?? params.betrayer ?? params.victim ?? params.nameB ?? "";
  }

  // 보구명
  const 보구명 = params.np ?? playerServant?.noblePhantasm?.name ?? "";

  // 영주 서수 (첫 번째 / 두 번째 / 세 번째)
  const sealNum = params.sealNumber ? parseInt(params.sealNumber, 10) : 0;
  const sealOrd = sealNum > 0 && sealNum <= SEAL_ORDINALS.length
    ? SEAL_ORDINALS[sealNum - 1]
    : "";

  return { A, B, 보구명, sealOrd };
}

// ─── 메인 ───

const MAX_BODY_LINES = 14;
const CONNECTOR_INTERVAL = 3; // 매 N개 마일스톤마다 연결사 삽입

export function generateMemoir(state: TRPGGameState): NarrativeLine[] {
  const T = getMemoirTemplates();
  const milestones = extractMilestones(state);
  const isVictory = state.winnerId === state.playerServantId;
  const playerMaster = state.masters.find((m) => m.servantId === state.playerServantId);
  const affectionTier = getTier(playerMaster?.affection ?? 50);
  const playerServant = state.servantMap[state.playerServantId];
  const playerName = playerServant?.name ?? "";

  const lines: NarrativeLine[] = [];

  // ── 개막 ──
  const openingPool = isVictory ? T.MEMOIR_OPENING.victory : T.MEMOIR_OPENING.defeat;
  const openingText = fillTemplate(pick(openingPool), {
    A: playerName,
    day: String(state.day),
  });
  lines.push(makeLine(openingText, "np_glow", "slow", 1200));

  // ── 본문 마일스톤 ──
  const bodyMilestones = milestones.slice(0, MAX_BODY_LINES);
  let sinceConnector = 0;

  for (let i = 0; i < bodyMilestones.length; i++) {
    const ms = bodyMilestones[i];

    // 연결사 삽입 (첫 마일스톤 전에는 X)
    if (i > 0 && sinceConnector >= CONNECTOR_INTERVAL) {
      lines.push(makeLine(pick(T.MEMOIR_CONNECTORS), "normal", "normal", 600));
      sinceConnector = 0;
    }

    const pool = T.MEMOIR_MILESTONES[ms.type];
    if (!pool || pool.length === 0) continue;

    const { A, B, 보구명, sealOrd } = resolveNames(ms, state);
    const text = fillTemplate(pick(pool), {
      A,
      B: B || "알 수 없는 적",
      sealOrd,
      day: String(ms.day),
      보구명,
      npName: 보구명,
      result: ms.params.result ?? "",
    });

    const mapping = EFFECT_MAP[ms.type] ?? { effect: "normal" as NarrativeEffect, speed: "fast" as NarrativeSpeed };
    lines.push(makeLine(text, mapping.effect, mapping.speed, 500));
    sinceConnector++;
  }

  // ── 마무리 ──
  let closingKey: string;
  if (!isVictory) {
    closingKey = "defeat";
  } else if (affectionTier === "devoted") {
    closingKey = "victory_devoted";
  } else if (affectionTier === "intimate") {
    closingKey = "victory_intimate";
  } else if (affectionTier === "trusting") {
    closingKey = "victory_trusting";
  } else if (affectionTier === "hostile") {
    closingKey = "victory_hostile";
  } else if (affectionTier === "wary") {
    closingKey = "victory_wary";
  } else {
    closingKey = "victory_neutral";
  }

  const closingPool = T.MEMOIR_CLOSING[closingKey] ?? T.MEMOIR_CLOSING.defeat;
  const closingText = fillTemplate(pick(closingPool), {
    A: playerName,
    day: String(state.day),
  });
  lines.push(makeLine("", "normal", "normal", 800)); // 빈 줄 (간격)
  lines.push(makeLine(closingText, "normal", "fast", 1000));

  // ── 소원 에필로그 ──
  if (state.wish) {
    const wishText = fillTemplate(pick(T.MEMOIR_WISH), {
      wish: state.wish,
      A: playerName,
    });
    lines.push(makeLine(wishText, "servant_dialogue", "fast", 400));
  }

  return lines;
}
