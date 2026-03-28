import type { AffectionTier } from "./affection";
import type { PersonalityTag } from "../data/servantPersonality";

// ─── 결과 타입 ───

export type ManaSupplyResult = "perfect" | "good" | "normal" | "poor" | "critical_fail";

export interface ManaSupplyOutcome {
  result: ManaSupplyResult;
  statDelta: number;      // 스탯 점수 변화 (+4 ~ -2)
  affectionDelta: number; // 호감도 변화
  narration: string;      // 3인칭 묘사
}

// ─── 해금 조건 ───

export function isManaSupplyUnlocked(tier: AffectionTier): boolean {
  return tier === "trusting" || tier === "intimate" || tier === "devoted";
}

// ─── 확률표 ───

type ProbabilityTable = Record<ManaSupplyResult, number>;

const PROBABILITY_TABLES: Partial<Record<AffectionTier, ProbabilityTable>> = {
  trusting: { perfect: 0.10, good: 0.35, normal: 0.35, poor: 0.15, critical_fail: 0.05 },
  intimate: { perfect: 0.25, good: 0.40, normal: 0.25, poor: 0.08, critical_fail: 0.02 },
  devoted:  { perfect: 0.40, good: 0.35, normal: 0.20, poor: 0.05, critical_fail: 0.00 },
};

// ─── 결과별 효과 ───

const RESULT_EFFECTS: Record<ManaSupplyResult, { statDelta: number; affectionDelta: number }> = {
  perfect:       { statDelta: 4,  affectionDelta: 5 },
  good:          { statDelta: 2,  affectionDelta: 2 },
  normal:        { statDelta: 1,  affectionDelta: 0 },
  poor:          { statDelta: 0,  affectionDelta: -2 },
  critical_fail: { statDelta: -2, affectionDelta: -5 },
};

// ─── 판정 ───

export function rollManaSupply(
  personality: PersonalityTag,
  tier: AffectionTier,
  servantName: string,
  servantId: number,
): ManaSupplyOutcome {
  const table = PROBABILITY_TABLES[tier];
  if (!table) {
    // fallback: 해금 안 됐는데 호출됨
    return { result: "normal", statDelta: 0, affectionDelta: 0, narration: "" };
  }

  // 확률 롤
  const roll = Math.random();
  let cumulative = 0;
  let result: ManaSupplyResult = "normal";
  for (const [key, prob] of Object.entries(table) as [ManaSupplyResult, number][]) {
    cumulative += prob;
    if (roll < cumulative) {
      result = key;
      break;
    }
  }

  const effects = RESULT_EFFECTS[result];
  const narration = getNarration(personality, result, servantName, servantId);

  return {
    result,
    statDelta: effects.statDelta,
    affectionDelta: effects.affectionDelta,
    narration,
  };
}

// ─── 묘사 (default 성격 기반, override는 narrativeTemplates.json에서 확장 가능) ───

type NarrationPool = Record<ManaSupplyResult, string[]>;

const DEFAULT_NARRATIONS: Record<PersonalityTag, NarrationPool> = {
  assassin: {
    perfect: [
      "{name}의 기척이 순간 사라졌다가 돌아왔다. 마력이 완전히 충전되었다.",
      "{name}(이)가 그림자 속에서 조용히 고개를 끄덕였다. 최상의 상태다.",
    ],
    good: [
      "{name}(은)는 아무 말 없이 마력을 받아들였다. 나쁘지 않은 결과다.",
      "{name}(이)가 소리 없이 자리를 떴다. 만족한 것 같다.",
    ],
    normal: [
      "{name}(이)가 기척도 없이 사라졌다. 충분한 것 같다.",
    ],
    poor: [
      "{name}의 시선이 차갑게 마스터를 스쳤다. '다음엔 더 잘 해.'",
    ],
    critical_fail: [
      "{name}(이)가 칼날을 스치듯 꺼내들었다가 다시 집어넣었다. 경고다.",
    ],
  },
  cool: {
    perfect: [
      "{name}의 눈빛이 전과는 확연히 달라졌다.",
      "{name}(이)가 '충분하다'라는 한마디를 남기고 미소를 보였다.",
    ],
    good: [
      "{name}(이)가 '충분하다'라는 한마디를 남기고 방을 나갔다.",
      "{name}(은)는 만족스러운 듯 마력의 흐름을 확인했다.",
    ],
    normal: [
      "무난한 마력 공급이었다. {name}(이)가 별 말 없이 자리를 떴다.",
    ],
    poor: [
      "{name}(은)는 마스터에게 약간 실망한 듯하다.",
    ],
    critical_fail: [
      "이 일은 없었던 걸로 하자는 무언의 합의가 이루어졌다.",
    ],
  },
  tsundere: {
    perfect: [
      "{name}(이)가 고개를 돌렸지만, 귀가 빨개진 건 숨기지 못했다.",
    ],
    good: [
      "{name}(이)가 '뭐, 그럭저럭이네'라고 했지만 표정은 나쁘지 않다.",
    ],
    normal: [
      "{name}(이)가 한숨을 쉬었다. 그래도 마력은 받아들인 모양이다.",
    ],
    poor: [
      "{name}(이)가 마스터를 흘겨보았다. '...다음엔 좀 더 신경 써.'",
    ],
    critical_fail: [
      "{name}(이)가 베개를 던졌다. 정확히 얼굴에 맞았다.",
    ],
  },
  cheerful: {
    perfect: [
      "{name}(이)가 엄지를 치켜세웠다! 최고의 마력 공급이다!",
    ],
    good: [
      "{name}(이)가 엄지를 치켜세웠다. 단순하지만 기분 좋은 반응이다.",
    ],
    normal: [
      "{name}(이)가 고개를 끄덕였다. '괜찮아, 다음엔 더 잘 될 거야!'",
    ],
    poor: [
      "{name}(이)가 만족하지 못했지만, 마스터를 격려하기로 마음먹은 것 같다.",
    ],
    critical_fail: [
      "{name}(이)가 웃으며 '...다음엔 더 잘하자'라고 말했다. 위로인 건지 협박인 건지...",
    ],
  },
  royal: {
    perfect: [
      "{name}(이)가 처음으로 마스터를 '신하'가 아닌 '벗'이라 불렀다.",
    ],
    good: [
      "{name}(이)가 '합격이다'라고 선언했다. 왕의 허가를 받은 셈이다.",
    ],
    normal: [
      "{name}(이)가 하품을 했다. 좋은 신호는 아닌 것 같다.",
    ],
    poor: [
      "{name}(이)가 '잡종'이라는 호칭을 다시 쓰기 시작했다.",
    ],
    critical_fail: [
      "{name}(이)가 보구를 마스터에게 겨누려다 멈췄다. 자비인 것 같다.",
    ],
  },
  berserker: {
    perfect: [
      "{name}의 포효가 멈췄다. 기분이 좋은 것 같다. ...아마도.",
    ],
    good: [
      "{name}(이)가 조용해졌다. 만족의 표시... 인 것 같다.",
    ],
    normal: [
      "{name}(이)가 으르렁거렸다. 평소와 다를 바 없다.",
    ],
    poor: [
      "{name}(이)가 불쾌해 보인다. 가까이 가지 않는 게 좋겠다.",
    ],
    critical_fail: [
      "{name}(이)가 벽을 부쉈다. 마력 공급이 문제가 아니다. 생존이 문제다.",
    ],
  },
  saint: {
    perfect: [
      "{name}(이)가 마스터의 손을 부드럽게 잡았다. 신성한 마력이 서로를 감쌌다.",
    ],
    good: [
      "{name}(이)가 감사의 기도를 올렸다. 마력이 따뜻하게 흘러들었다.",
    ],
    normal: [
      "{name}(이)가 미소지었다. '감사합니다, 마스터.'",
    ],
    poor: [
      "{name}(이)가 조용히 한숨을 쉬었지만, 마스터를 탓하지는 않았다.",
    ],
    critical_fail: [
      "{name}(이)가 마스터를 위해 기도하고 있다. ...구원이 필요한 건 마스터인 모양이다.",
    ],
  },
  avenger: {
    perfect: [
      "{name}의 증오가 잠시 멈춘 것 같다. 마스터에게 보이는 최대한의 호의다.",
    ],
    good: [
      "{name}(이)가 고개를 끄덕였다. 증오의 불꽃 사이로 작은 신뢰가 보인다.",
    ],
    normal: [
      "{name}(이)가 무표정으로 마력을 받아들였다.",
    ],
    poor: [
      "{name}의 눈빛이 차가워졌다. '...쓸모없군.'",
    ],
    critical_fail: [
      "{name}(이)가 마스터에게서 등을 돌렸다. 신뢰가 크게 손상된 것 같다.",
    ],
  },
};

/** 서번트 ID별 오버라이드 (추후 narrativeTemplates.json으로 이전 가능) */
const NARRATION_OVERRIDES: Record<number, Partial<NarrationPool>> = {
  // 길가메쉬
  12: {
    perfect: ["영웅왕이 처음으로 마스터를 '벗'이라 불렀다."],
    poor: ["길가메쉬가 '잡종'이라는 호칭을 다시 쓰기 시작했다."],
    critical_fail: ["길가메쉬가 에아를 마스터에게 겨누려다 멈췄다."],
  },
  // 쿠 훌린
  20: {
    perfect: ["쿠 훌린이 활짝 웃었다. '최고다, 마스터!'"],
    good: ["쿠 훌린이 엄지를 치켜세웠다. '나쁘지 않아.'"],
  },
  // 잔 다르크
  66: {
    perfect: ["잔 다르크가 마스터의 손을 잡았다. 성녀의 축복이 따뜻하게 감싸온다."],
    critical_fail: ["잔 다르크가 마스터를 위해 기도하고 있다. ...구원이 필요한 건 마스터인 모양이다."],
  },
  // 마슈
  1: {
    perfect: ["마슈의 얼굴이 새빨개졌다. '선...선배...!'"],
    good: ["마슈가 미소지었다. '마스터의 마력은 항상 따뜻해요.'"],
  },
};

function getNarration(personality: PersonalityTag, result: ManaSupplyResult, servantName: string, servantId: number): string {
  // 1. 오버라이드 확인
  const overrides = NARRATION_OVERRIDES[servantId];
  if (overrides?.[result]?.length) {
    const pool = overrides[result]!;
    return pool[Math.floor(Math.random() * pool.length)].replace(/\{name\}/g, servantName);
  }

  // 2. 기본 성격 풀
  const pool = DEFAULT_NARRATIONS[personality][result];
  const text = pool[Math.floor(Math.random() * pool.length)];
  return text.replace(/\{name\}/g, servantName);
}

// ─── 결과 표시용 라벨 ───

export const RESULT_LABELS_KO: Record<ManaSupplyResult, string> = {
  perfect: "대만족",
  good: "만족",
  normal: "보통",
  poor: "불만족",
  critical_fail: "극단적 실패",
};

export const RESULT_LABELS_EN: Record<ManaSupplyResult, string> = {
  perfect: "Perfect",
  good: "Good",
  normal: "Normal",
  poor: "Poor",
  critical_fail: "Critical Failure",
};

export const RESULT_LABELS_JA: Record<ManaSupplyResult, string> = {
  perfect: "大満足",
  good: "満足",
  normal: "普通",
  poor: "不満足",
  critical_fail: "致命的失敗",
};

export const RESULT_COLORS: Record<ManaSupplyResult, string> = {
  perfect: "#ffd700",
  good: "#4ade80",
  normal: "#9ca3af",
  poor: "#f97316",
  critical_fail: "#ef4444",
};
