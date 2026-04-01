import type { AffectionTier } from "./affection";
import type { PersonalityTag } from "../data/servantPersonality";
import i18n from "../i18n";

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
  // 확률표가 없는 경우 (약화 상태로 해금됨 등) neutral 테이블 사용
  const FALLBACK_TABLE: ProbabilityTable = { perfect: 0.05, good: 0.20, normal: 0.45, poor: 0.20, critical_fail: 0.10 };
  const table = PROBABILITY_TABLES[tier] ?? FALLBACK_TABLE;

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

// ─── Korean narrations (default) ───

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

// ─── English narrations ───

const DEFAULT_NARRATIONS_EN: Record<PersonalityTag, NarrationPool> = {
  assassin: {
    perfect: [
      "{name}'s presence vanished for an instant, then returned. Mana reserves are fully replenished.",
      "{name} nodded silently from the shadows. A flawless transfer of magical energy.",
    ],
    good: [
      "{name} accepted the mana without a word. A satisfactory result.",
      "{name} slipped away soundlessly. They seem content.",
    ],
    normal: [
      "{name} disappeared without a trace. It seems to have been sufficient.",
    ],
    poor: [
      "{name}'s cold gaze swept over the Master. 'Do better next time.'",
    ],
    critical_fail: [
      "{name} drew a blade halfway, then sheathed it again. Consider that a warning.",
    ],
  },
  cool: {
    perfect: [
      "Something has changed in {name}'s gaze. A light that was not there before.",
      "{name} allowed a faint smile. 'That will suffice.' High praise indeed.",
    ],
    good: [
      "{name} left with a single word: 'Adequate.' From them, that is approval.",
      "{name} examined the flow of mana with quiet satisfaction.",
    ],
    normal: [
      "An unremarkable mana transfer. {name} departed without comment.",
    ],
    poor: [
      "{name} seems faintly disappointed in the Master.",
    ],
    critical_fail: [
      "An unspoken agreement was reached: this never happened.",
    ],
  },
  tsundere: {
    perfect: [
      "{name} turned away, but the reddening of their ears betrayed everything.",
    ],
    good: [
      "'W-well, it was passable, I suppose,' {name} muttered, though their expression said otherwise.",
    ],
    normal: [
      "{name} sighed. Still, the mana was accepted all the same.",
    ],
    poor: [
      "{name} shot the Master a withering glare. '...Try harder next time.'",
    ],
    critical_fail: [
      "{name} hurled a pillow. It struck the Master square in the face.",
    ],
  },
  cheerful: {
    perfect: [
      "{name} gave an enthusiastic thumbs up! A perfect mana supply!",
    ],
    good: [
      "{name} flashed a thumbs up. Simple, but heartwarming.",
    ],
    normal: [
      "{name} nodded reassuringly. 'It's fine! We'll do even better next time!'",
    ],
    poor: [
      "{name} wasn't satisfied, but decided to encourage the Master anyway.",
    ],
    critical_fail: [
      "{name} smiled and said, '...Let's do better next time.' Is that comfort or a threat...?",
    ],
  },
  royal: {
    perfect: [
      "For the first time, {name} addressed the Master not as 'subject,' but as 'companion.'",
    ],
    good: [
      "{name} declared, 'You pass.' To receive a king's approval is no small feat.",
    ],
    normal: [
      "{name} yawned. Not an encouraging sign.",
    ],
    poor: [
      "{name} has resumed using the word 'mongrel' again.",
    ],
    critical_fail: [
      "{name} leveled their Noble Phantasm at the Master, then stayed their hand. Call it mercy.",
    ],
  },
  berserker: {
    perfect: [
      "{name}'s roaring ceased. They seem pleased. ...Probably.",
    ],
    good: [
      "{name} fell quiet. A sign of satisfaction... presumably.",
    ],
    normal: [
      "{name} growled. No different from usual.",
    ],
    poor: [
      "{name} looks displeased. Best to keep your distance.",
    ],
    critical_fail: [
      "{name} smashed through a wall. Mana supply is no longer the issue. Survival is.",
    ],
  },
  saint: {
    perfect: [
      "{name} gently took the Master's hand. Sacred mana enveloped them both in warmth.",
    ],
    good: [
      "{name} offered a prayer of gratitude. The mana flowed in, warm and gentle.",
    ],
    normal: [
      "{name} smiled softly. 'Thank you, Master.'",
    ],
    poor: [
      "{name} let out a quiet sigh, but did not blame the Master.",
    ],
    critical_fail: [
      "{name} is praying for the Master. ...It seems the one who needs salvation is the Master.",
    ],
  },
  avenger: {
    perfect: [
      "{name}'s hatred seemed to pause, if only for a moment. This is the most favor they can show.",
    ],
    good: [
      "{name} gave a slight nod. Through the flames of hatred, a flicker of trust could be seen.",
    ],
    normal: [
      "{name} accepted the mana with an expressionless face.",
    ],
    poor: [
      "{name}'s eyes turned cold. '...Useless.'",
    ],
    critical_fail: [
      "{name} turned their back on the Master. Trust has been severely damaged.",
    ],
  },
};

// ─── Japanese narrations ───

const DEFAULT_NARRATIONS_JA: Record<PersonalityTag, NarrationPool> = {
  assassin: {
    perfect: [
      "{name}の気配が一瞬消え、再び戻った。魔力は完全に充填された。",
      "{name}は影の中から静かに頷いた。最上の状態だ。",
    ],
    good: [
      "{name}は何も言わず魔力を受け入れた。悪くない結果だ。",
      "{name}は音もなく姿を消した。満足したようだ。",
    ],
    normal: [
      "{name}は気配もなく消えた。十分だったようだ。",
    ],
    poor: [
      "{name}の視線が冷たくマスターを掠めた。「次はもっとうまくやれ。」",
    ],
    critical_fail: [
      "{name}が刃を抜きかけ、再び納めた。警告だ。",
    ],
  },
  cool: {
    perfect: [
      "{name}の眼差しが以前とは明らかに変わっていた。",
      "{name}は「十分だ」と一言残し、微かに笑みを見せた。",
    ],
    good: [
      "{name}は「十分だ」と一言残し、部屋を出た。",
      "{name}は満足げに魔力の流れを確認した。",
    ],
    normal: [
      "無難な魔力供給だった。{name}は何も言わず去っていった。",
    ],
    poor: [
      "{name}はマスターに少し失望したようだ。",
    ],
    critical_fail: [
      "この件はなかったことにしよう——無言の合意が成立した。",
    ],
  },
  tsundere: {
    perfect: [
      "{name}は顔を背けたが、耳が赤くなっているのは隠しきれなかった。",
    ],
    good: [
      "{name}は「まあ、悪くないんじゃない」と言ったが、表情は悪くなかった。",
    ],
    normal: [
      "{name}はため息をついた。それでも魔力は受け入れたようだ。",
    ],
    poor: [
      "{name}がマスターを睨んだ。「……次はもうちょっと頑張りなさいよ。」",
    ],
    critical_fail: [
      "{name}が枕を投げつけた。見事にマスターの顔面に命中した。",
    ],
  },
  cheerful: {
    perfect: [
      "{name}が親指を立てた！最高の魔力供給だ！",
    ],
    good: [
      "{name}が親指を立てた。単純だが気分のいい反応だ。",
    ],
    normal: [
      "{name}が頷いた。「大丈夫、次はもっとうまくいくよ！」",
    ],
    poor: [
      "{name}は満足できなかったようだが、マスターを励ますことに決めたようだ。",
    ],
    critical_fail: [
      "{name}は笑いながら「……次はもっと頑張ろう」と言った。慰めなのか脅しなのか……。",
    ],
  },
  royal: {
    perfect: [
      "{name}が初めてマスターを「臣下」ではなく「友」と呼んだ。",
    ],
    good: [
      "{name}が「合格だ」と宣言した。王の許しを得たということだ。",
    ],
    normal: [
      "{name}が欠伸をした。良い兆候ではなさそうだ。",
    ],
    poor: [
      "{name}が「雑種」という呼称を再び使い始めた。",
    ],
    critical_fail: [
      "{name}が宝具をマスターに向けかけ、止めた。慈悲のつもりらしい。",
    ],
  },
  berserker: {
    perfect: [
      "{name}の咆哮が止んだ。機嫌が良いようだ。……たぶん。",
    ],
    good: [
      "{name}が静かになった。満足の表れ……だと思いたい。",
    ],
    normal: [
      "{name}が唸り声を上げた。いつもと変わりない。",
    ],
    poor: [
      "{name}は不快そうだ。近づかない方がいい。",
    ],
    critical_fail: [
      "{name}が壁を破壊した。魔力供給の問題ではない。生存の問題だ。",
    ],
  },
  saint: {
    perfect: [
      "{name}がマスターの手を優しく取った。神聖な魔力が二人を包み込んだ。",
    ],
    good: [
      "{name}が感謝の祈りを捧げた。魔力が温かく流れ込んできた。",
    ],
    normal: [
      "{name}が微笑んだ。「ありがとうございます、マスター。」",
    ],
    poor: [
      "{name}は静かにため息をついたが、マスターを責めはしなかった。",
    ],
    critical_fail: [
      "{name}がマスターのために祈っている。……救いが必要なのはマスターの方らしい。",
    ],
  },
  avenger: {
    perfect: [
      "{name}の憎悪が一瞬止まったようだ。マスターに見せる最大限の好意だ。",
    ],
    good: [
      "{name}が頷いた。憎悪の炎の間に、小さな信頼が垣間見えた。",
    ],
    normal: [
      "{name}は無表情のまま魔力を受け入れた。",
    ],
    poor: [
      "{name}の目が冷たくなった。「……役立たずが。」",
    ],
    critical_fail: [
      "{name}がマスターに背を向けた。信頼が大きく損なわれたようだ。",
    ],
  },
};

// ─── Korean overrides ───

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

// ─── English overrides ───

const NARRATION_OVERRIDES_EN: Record<number, Partial<NarrationPool>> = {
  // Gilgamesh
  12: {
    perfect: ["For the first time, the King of Heroes addressed the Master as 'friend.'"],
    poor: ["Gilgamesh has resumed calling the Master 'mongrel.'"],
    critical_fail: ["Gilgamesh raised Ea toward the Master, then stayed his hand."],
  },
  // Cu Chulainn
  20: {
    perfect: ["Cu Chulainn broke into a wide grin. 'That was the best, Master!'"],
    good: ["Cu Chulainn gave a thumbs up. 'Not bad at all.'"],
  },
  // Jeanne d'Arc
  66: {
    perfect: ["Jeanne d'Arc took the Master's hand. The saint's blessing enveloped them in warmth."],
    critical_fail: ["Jeanne d'Arc is praying for the Master. ...It seems salvation is needed on the Master's end."],
  },
  // Mash Kyrielight
  1: {
    perfect: ["Mash's face turned bright red. 'S-Senpai...!'"],
    good: ["Mash smiled gently. 'Master's mana is always so warm.'"],
  },
};

// ─── Japanese overrides ───

const NARRATION_OVERRIDES_JA: Record<number, Partial<NarrationPool>> = {
  // ギルガメッシュ
  12: {
    perfect: ["英雄王が初めてマスターを「友」と呼んだ。"],
    poor: ["ギルガメッシュが再び「雑種」という呼称を使い始めた。"],
    critical_fail: ["ギルガメッシュがエアをマスターに向けかけ、止めた。"],
  },
  // クー・フーリン
  20: {
    perfect: ["クー・フーリンが満面の笑みを浮かべた。「最高だぜ、マスター！」"],
    good: ["クー・フーリンが親指を立てた。「悪くないな。」"],
  },
  // ジャンヌ・ダルク
  66: {
    perfect: ["ジャンヌ・ダルクがマスターの手を取った。聖女の祝福が温かく包み込む。"],
    critical_fail: ["ジャンヌ・ダルクがマスターのために祈っている。……救いが必要なのはマスターの方らしい。"],
  },
  // マシュ
  1: {
    perfect: ["マシュの顔が真っ赤になった。「せ、先輩……！」"],
    good: ["マシュが微笑んだ。「マスターの魔力はいつも温かいです。」"],
  },
};

// ─── Language-aware narration selector ───

function getNarrationData(): {
  defaults: Record<PersonalityTag, NarrationPool>;
  overrides: Record<number, Partial<NarrationPool>>;
} {
  const lang = i18n.language;
  if (lang === "en") {
    return { defaults: DEFAULT_NARRATIONS_EN, overrides: NARRATION_OVERRIDES_EN };
  }
  if (lang === "ja") {
    return { defaults: DEFAULT_NARRATIONS_JA, overrides: NARRATION_OVERRIDES_JA };
  }
  // default: Korean
  return { defaults: DEFAULT_NARRATIONS, overrides: NARRATION_OVERRIDES };
}

function getNarration(personality: PersonalityTag, result: ManaSupplyResult, servantName: string, servantId: number): string {
  const { defaults, overrides } = getNarrationData();

  // 1. 오버라이드 확인
  const override = overrides[servantId];
  if (override?.[result]?.length) {
    const pool = override[result]!;
    return pool[Math.floor(Math.random() * pool.length)].replace(/\{name\}/g, servantName);
  }

  // 2. 기본 성격 풀
  const pool = defaults[personality][result];
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
