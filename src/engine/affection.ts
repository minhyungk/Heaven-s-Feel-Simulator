import type { Intent } from "./types";
import type { PersonalityTag } from "../data/servantPersonality";

// ─── Tiers ───

export type AffectionTier = "hostile" | "wary" | "neutral" | "trusting" | "intimate" | "devoted";

export function getTier(value: number): AffectionTier {
  if (value < 20) return "hostile";
  if (value < 40) return "wary";
  if (value < 60) return "neutral";
  if (value < 80) return "trusting";
  if (value < 90) return "intimate";
  return "devoted";
}

/** Clamp affection to 0~100 */
export function clampAffection(value: number): number {
  return Math.max(0, Math.min(100, value));
}

// ─── Command Refusal ───

const REFUSAL_CHANCE: Record<AffectionTier, number> = {
  hostile: 0.40,
  wary: 0.15,
  neutral: 0,
  trusting: 0,
  intimate: 0,
  devoted: 0,
};

export function getRefusalChance(tier: AffectionTier): number {
  return REFUSAL_CHANCE[tier];
}

export function checkRefusal(tier: AffectionTier): boolean {
  const chance = getRefusalChance(tier);
  if (chance <= 0) return false;
  return Math.random() < chance;
}

// ─── Combat Bonus ───

const COMBAT_BONUS: Record<AffectionTier, number> = {
  hostile: -0.10,
  wary: -0.05,
  neutral: 0,
  trusting: 0.03,
  intimate: 0.05,
  devoted: 0.08,
};

export function getCombatBonus(tier: AffectionTier): number {
  return COMBAT_BONUS[tier];
}

// ─── Action Preference ───

interface ActionPreference {
  liked: Intent[];
  disliked: Intent[];
}

const ACTION_PREFERENCES: Record<PersonalityTag, ActionPreference> = {
  // 공격적: hunt 선호, hide 비선호
  berserker: { liked: ["hunt"], disliked: ["hide"] },
  avenger: { liked: ["hunt"], disliked: ["hide"] },
  // 수비적: guard 선호
  cool: { liked: ["guard"], disliked: [] },
  saint: { liked: ["guard"], disliked: [] },
  // 은밀: hide/guard 선호
  tsundere: { liked: ["hide", "guard"], disliked: ["hunt"] },
  // 자유: 뭐든 수용
  cheerful: { liked: ["hunt", "guard", "hide"], disliked: [] },
  // 왕: hunt 선호, hide 비선호
  royal: { liked: ["hunt"], disliked: ["hide"] },
};

export function affectionFromAction(intent: Intent, personality: PersonalityTag): number {
  const pref = ACTION_PREFERENCES[personality];
  if (pref.liked.includes(intent)) return 2 + Math.floor(Math.random() * 2); // +2~3
  if (pref.disliked.includes(intent)) return -(2 + Math.floor(Math.random() * 2)); // -2~3
  return 0;
}

// ─── Battle Result ───

export function affectionFromBattle(won: boolean, escaped: boolean, wasDisadvantaged: boolean): number {
  if (won) {
    return wasDisadvantaged
      ? 5 + Math.floor(Math.random() * 4)  // +5~8
      : 3 + Math.floor(Math.random() * 3); // +3~5
  }
  if (escaped) return -1;
  return -(3 + Math.floor(Math.random() * 3)); // -3~5
}

// ─── Command Seal Usage ───

export function affectionFromSeal(sealType: string, resultedInWin: boolean): number {
  switch (sealType) {
    case "boost":
      return resultedInWin ? 3 : 0;
    case "escape":
      return 2; // 위기 탈출
    case "npFullPower":
      return resultedInWin ? 3 : 0;
    case "forceCommand":
      return -(8 + Math.floor(Math.random() * 3)); // -8~10
    case "madControl":
      return -3;
    default:
      return 0;
  }
}

// ─── Stealth / Quiet ───

export function affectionFromStealth(success: boolean): number {
  return success ? 1 : -2;
}

export function affectionFromQuietNight(): number {
  return 1;
}

// ─── Refusal Override by Personality ───

/** 거부 시 서번트 독자 행동 선택 */
export function getRefusalOverrideIntent(personality: PersonalityTag): Intent {
  const pref = ACTION_PREFERENCES[personality];
  if (pref.liked.length > 0) {
    return pref.liked[Math.floor(Math.random() * pref.liked.length)];
  }
  const all: Intent[] = ["hunt", "guard", "hide"];
  return all[Math.floor(Math.random() * all.length)];
}

// ─── Tier Display ───

export const TIER_COLORS: Record<AffectionTier, string> = {
  hostile: "#ef4444",   // red
  wary: "#f97316",      // orange
  neutral: "#6b7280",   // gray
  trusting: "#3b82f6",  // blue
  intimate: "#8b5cf6",  // purple
  devoted: "#ffd700",   // gold
};

export const TIER_LABELS_KO: Record<AffectionTier, string> = {
  hostile: "적대",
  wary: "경계",
  neutral: "중립",
  trusting: "신뢰",
  intimate: "친밀",
  devoted: "헌신",
};

export const TIER_LABELS_EN: Record<AffectionTier, string> = {
  hostile: "Hostile",
  wary: "Wary",
  neutral: "Neutral",
  trusting: "Trusting",
  intimate: "Intimate",
  devoted: "Devoted",
};

export const TIER_LABELS_JA: Record<AffectionTier, string> = {
  hostile: "敵対",
  wary: "警戒",
  neutral: "中立",
  trusting: "信頼",
  intimate: "親密",
  devoted: "献身",
};
