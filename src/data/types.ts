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
