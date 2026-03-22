import type { SkillPrefixes } from "../engine/types";

export const SKILL_PREFIXES: Record<string, SkillPrefixes> = {
  ko: {
    presenceConcealment: "기척 차단",
    magicResistance: "대 마력",
    itemConstruction: "도구작성",
    territoryCreation: "진지작성",
    riding: "기승",
    independentAction: "단독행동",
    independentManifestation: "단독현현",
    presenceDetection: "기척감지",
    madEnhancement: "광화",
    divinity: "신성",
  },
  en: {
    presenceConcealment: "Presence Concealment",
    magicResistance: "Magic Resistance",
    itemConstruction: "Item Construction",
    territoryCreation: "Territory Creation",
    riding: "Riding",
    independentAction: "Independent Action",
    independentManifestation: "Independent Manifestation",
    presenceDetection: "Presence Detection",
    madEnhancement: "Mad Enhancement",
    divinity: "Divinity",
  },
  ja: {
    presenceConcealment: "気配遮断",
    magicResistance: "対魔力",
    itemConstruction: "道具作成",
    territoryCreation: "陣地作成",
    riding: "騎乗",
    independentAction: "単独行動",
    independentManifestation: "単独顕現",
    presenceDetection: "気配感知",
    madEnhancement: "狂化",
    divinity: "神性",
  },
};

export function getSkillPrefixes(lang: string): SkillPrefixes {
  return SKILL_PREFIXES[lang] ?? SKILL_PREFIXES.ko;
}
