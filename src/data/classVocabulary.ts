import type { ServantClass } from "./types";
import i18n from "../i18n";

export interface ClassVocab {
  weapon: string;
  weaponAlt: string;
  verb: string;
  verbAlt: string;
  style: string;
}

const CLASS_VOCABULARY_KO: Partial<Record<ServantClass, ClassVocab>> = {
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

const CLASS_VOCABULARY_EN: Partial<Record<ServantClass, ClassVocab>> = {
  Saber: { weapon: "sword", weaponAlt: "holy sword", verb: "slash", verbAlt: "strike down", style: "swordsmanship" },
  Archer: { weapon: "arrow", weaponAlt: "projectile", verb: "shoot", verbAlt: "pierce through", style: "marksmanship" },
  Lancer: { weapon: "lance", weaponAlt: "long spear", verb: "thrust", verbAlt: "graze past", style: "spearmanship" },
  Rider: { weapon: "chariot", weaponAlt: "mount", verb: "charge", verbAlt: "race through", style: "riding" },
  Caster: { weapon: "magecraft", weaponAlt: "spell", verb: "deploy", verbAlt: "activate", style: "sorcery" },
  Assassin: { weapon: "dagger", weaponAlt: "poison", verb: "infiltrate", verbAlt: "silently", style: "assassination" },
  Berserker: { weapon: "fist", weaponAlt: "weapon", verb: "smash", verbAlt: "crush", style: "rampage" },
  Ruler: { weapon: "banner", weaponAlt: "holy relic", verb: "decree", verbAlt: "judge", style: "governance" },
  Avenger: { weapon: "grudge", weaponAlt: "black flame", verb: "devour", verbAlt: "curse", style: "vengeance" },
  Shielder: { weapon: "shield", weaponAlt: "rampart", verb: "block", verbAlt: "protect", style: "defense" },
};

const CLASS_VOCABULARY_JA: Partial<Record<ServantClass, ClassVocab>> = {
  Saber: { weapon: "剣", weaponAlt: "聖剣", verb: "斬撃", verbAlt: "振り下ろす", style: "剣術" },
  Archer: { weapon: "矢", weaponAlt: "飛び道具", verb: "射撃", verbAlt: "貫く", style: "射撃" },
  Lancer: { weapon: "槍", weaponAlt: "長槍", verb: "突き", verbAlt: "すれ違う", style: "槍術" },
  Rider: { weapon: "戦車", weaponAlt: "騎乗物", verb: "突進", verbAlt: "疾走する", style: "騎乗" },
  Caster: { weapon: "魔術", weaponAlt: "呪文", verb: "展開", verbAlt: "発動する", style: "魔術" },
  Assassin: { weapon: "短刀", weaponAlt: "毒", verb: "忍び寄る", verbAlt: "気配なく", style: "暗殺" },
  Berserker: { weapon: "拳", weaponAlt: "武器", verb: "砕く", verbAlt: "叩き潰す", style: "狂乱" },
  Ruler: { weapon: "旗", weaponAlt: "聖遺物", verb: "宣言する", verbAlt: "裁く", style: "統治" },
  Avenger: { weapon: "怨念", weaponAlt: "黒炎", verb: "呑み込む", verbAlt: "呪う", style: "復讐" },
  Shielder: { weapon: "盾", weaponAlt: "城壁", verb: "防ぐ", verbAlt: "守る", style: "防御" },
};

const VOCAB_DATA: Record<string, Partial<Record<ServantClass, ClassVocab>>> = {
  ko: CLASS_VOCABULARY_KO,
  en: CLASS_VOCABULARY_EN,
  ja: CLASS_VOCABULARY_JA,
};

const DEFAULT_VOCAB: Record<string, ClassVocab> = {
  ko: { weapon: "무기", weaponAlt: "힘", verb: "공격하다", verbAlt: "덮치다", style: "전투" },
  en: { weapon: "weapon", weaponAlt: "force", verb: "attack", verbAlt: "strike", style: "combat" },
  ja: { weapon: "武器", weaponAlt: "力", verb: "攻撃する", verbAlt: "襲いかかる", style: "戦闘" },
};

export function getVocab(servantClass: ServantClass): ClassVocab {
  const lang = i18n.language;
  const data = VOCAB_DATA[lang] ?? VOCAB_DATA.ko;
  return data[servantClass] ?? DEFAULT_VOCAB[lang] ?? DEFAULT_VOCAB.ko;
}
