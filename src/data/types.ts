export type ServantClass =
  | "Saber" | "Archer" | "Lancer" | "Rider"
  | "Caster" | "Assassin" | "Berserker"
  | "Ruler" | "Avenger" | "MoonCancer"
  | "AlterEgo" | "Foreigner";

export type StatRank = string; // "A+", "B", "EX", etc.

export interface SkillEntry {
  name: string;
  detail: string;
}

export interface Servant {
  id: number;
  name: string;
  class: ServantClass;
  stats: {
    strength: StatRank;
    endurance: StatRank;
    agility: StatRank;
    mana: StatRank;
    luck: StatRank;
    np: StatRank;
  };
  classSkills: SkillEntry[];
  personalSkills: SkillEntry[];
  noblePhantasm: {
    name: string;
    ruby: string;
    rank: string;
    type: string;
    detail: string;
  };
  imageUrl: string;
  profile: string;
}

export const BASIC_CLASSES: ServantClass[] = [
  "Saber", "Archer", "Lancer", "Rider", "Caster", "Assassin", "Berserker"
];

export const CLASS_COLORS: Record<ServantClass, string> = {
  Saber: "#3b82f6",
  Archer: "#ef4444",
  Lancer: "#2563eb",
  Rider: "#ec4899",
  Caster: "#8b5cf6",
  Assassin: "#6b7280",
  Berserker: "#dc2626",
  Ruler: "#eab308",
  Avenger: "#7c3aed",
  MoonCancer: "#06b6d4",
  AlterEgo: "#14b8a6",
  Foreigner: "#a855f7",
};

// 레이더 차트용 (기존)
export function statRankToNumber(rank: StatRank): number {
  if (!rank || rank === "?") return 5;
  if (rank === "EX") return 60;
  const base: Record<string, number> = {
    "E": 10, "D": 20, "C": 30, "B": 40, "A": 50,
  };
  const letter = rank[0];
  const modifier = rank.slice(1);
  let value = base[letter] || 10;
  if (modifier === "++") value += 10;
  else if (modifier === "+") value += 5;
  else if (modifier === "-") value -= 5;
  return value;
}

// 승률 계산용: E=3, D=4, C=5, B=6, A=7, EX=8, +=+0.5, ++=+1
export function statRankToScore(rank: StatRank): number | null {
  if (!rank || rank === "?") return null;
  if (rank === "EX") return 8;
  const base: Record<string, number> = {
    "E": 3, "D": 4, "C": 5, "B": 6, "A": 7,
  };
  const letter = rank[0];
  const modifier = rank.slice(1);
  const value = base[letter];
  if (value === undefined) return 5;
  if (modifier === "++") return value + 1;
  if (modifier === "+") return value + 0.5;
  if (modifier === "-") return value - 0.5;
  return value;
}

const STAT_KEYS = ["strength", "endurance", "agility", "mana", "luck", "np"] as const;

// 예외 스탯 총합 오버라이드 (이름 기준)
const SCORE_OVERRIDES: Record<string, number> = {
  "엘키두": 43,
  "“산의 노인”": 38
};

export function getServantTotalScore(servant: Servant): number {
  if (SCORE_OVERRIDES[servant.name] !== undefined) {
    return SCORE_OVERRIDES[servant.name];
  }
  let total = 0;
  for (const key of STAT_KEYS) {
    const score = statRankToScore(servant.stats[key]);
    if (score !== null) total += score;
  }
  return total;
}

// Elo 기반 예상 승률: 1 / (1 + 10^((Rb - Ra) / D))
// D=10 정도면 점수 합산 차이에 적절한 민감도
export function calcWinRate(myScore: number, enemyScore: number): number {
  const D = 10;
  return 1 / (1 + Math.pow(10, (enemyScore - myScore) / D));
}
