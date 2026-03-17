export const SKILL_PREFIXES: Record<string, Record<string, string>> = {
  ko: {
    presenceConcealment: "기척 차단",
    magicResistance: "대 마력",
    itemConstruction: "도구작성",
    territoryCreation: "진지작성",
  },
  en: {
    presenceConcealment: "Presence Concealment",
    magicResistance: "Magic Resistance",
    itemConstruction: "Item Construction",
    territoryCreation: "Territory Creation",
  },
  ja: {
    presenceConcealment: "気配遮断",
    magicResistance: "対魔力",
    itemConstruction: "道具作成",
    territoryCreation: "陣地作成",
  },
};

export function getSkillPrefixes(lang: string) {
  return SKILL_PREFIXES[lang] ?? SKILL_PREFIXES.ko;
}
