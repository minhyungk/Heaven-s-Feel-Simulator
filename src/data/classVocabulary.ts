import type { ServantClass } from "./types";

export interface ClassVocab {
  weapon: string;
  weaponAlt: string;
  verb: string;
  verbAlt: string;
  style: string;
}

export const CLASS_VOCABULARY: Partial<Record<ServantClass, ClassVocab>> = {
  Saber: { weapon: "검", weaponAlt: "성검", verb: "베기", verbAlt: "내려치다", style: "검술" },
  Archer: { weapon: "화살", weaponAlt: "투사체", verb: "쏘기", verbAlt: "관통하다", style: "사격" },
  Lancer: { weapon: "창", weaponAlt: "장창", verb: "찌르기", verbAlt: "스쳐지나가다", style: "창술" },
  Rider: { weapon: "전차", weaponAlt: "탈것", verb: "돌진", verbAlt: "질주하다", style: "기승" },
  Caster: { weapon: "마술", weaponAlt: "주문", verb: "전개", verbAlt: "발동하다", style: "마술" },
  Assassin: { weapon: "단검", weaponAlt: "독", verb: "스며들다", verbAlt: "기척 없이", style: "암살" },
  Berserker: { weapon: "주먹", weaponAlt: "무기", verb: "부수다", verbAlt: "짓이기다", style: "광란" },
  Ruler: { weapon: "깃발", weaponAlt: "성물", verb: "선언하다", verbAlt: "심판하다", style: "통치" },
  Avenger: { weapon: "원한", weaponAlt: "흑염", verb: "삼키다", verbAlt: "저주하다", style: "복수" },
  Shielder: { weapon: "방패", weaponAlt: "성벽", verb: "막다", verbAlt: "지키다", style: "방어" },
};

export function getVocab(servantClass: ServantClass): ClassVocab {
  return CLASS_VOCABULARY[servantClass] ?? {
    weapon: "무기", weaponAlt: "힘", verb: "공격하다", verbAlt: "덮치다", style: "전투",
  };
}
