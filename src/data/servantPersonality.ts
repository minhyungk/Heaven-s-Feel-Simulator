import type { ServantClass } from "./types";

export type PersonalityTag = "cool" | "tsundere" | "cheerful" | "royal" | "berserker" | "saint" | "avenger" | "assassin";

/** 초기 호감도 (성격별) */
export const INITIAL_AFFECTION: Record<PersonalityTag, number> = {
  cheerful: 55,
  saint: 50,
  tsundere: 45,
  cool: 40,
  royal: 35,
  berserker: 30,
  avenger: 25,
  assassin: 35,
};

/** 클래스 기반 기본 성격 매핑 */
const CLASS_DEFAULT_PERSONALITY: Partial<Record<ServantClass, PersonalityTag>> = {
  Saber: "cool",
  Archer: "cool",
  Lancer: "cheerful",
  Rider: "cheerful",
  Caster: "cool",
  Assassin: "assassin",
  Berserker: "berserker",
  Ruler: "saint",
  Avenger: "avenger",
  MoonCancer: "tsundere",
  AlterEgo: "cool",
  Foreigner: "cool",
  Pretender: "cool",
  Shielder: "cheerful",
};

/** 개별 서번트 성격 오버라이드 (ID 기준) */
const PERSONALITY_OVERRIDES: Record<number, PersonalityTag> = {
  // ─── Saber ───
  2: "royal",       // Artoria Pendragon
  3: "royal",       // Artoria Pendragon (Alter) — still royal but darker
  7: "royal",       // Nero Claudius → cheerful royal
  8: "royal",       // Altera
  68: "tsundere",   // Mordred
  76: "royal",      // Artoria Pendragon (Lily) → cheerful
  91: "cheerful",   // Chevalier d'Eon
  101: "royal",     // Rama
  121: "cool",      // Sigurd
  160: "royal",     // Arthur Pendragon (Prototype)
  213: "royal",     // Dioscuri
  223: "cool",      // Lancelot (Saber)
  254: "cool",      // Muramasa

  // ─── Archer ───
  11: "royal",      // Gilgamesh
  12: "royal",      // Gilgamesh
  13: "cool",       // Robin Hood
  14: "tsundere",   // Atalante
  15: "cool",       // EMIYA
  16: "cheerful",   // Euryale
  17: "tsundere",   // Arjuna
  19: "cheerful",   // David
  24: "tsundere",   // Ishtar
  62: "cool",       // Tristan
  95: "cheerful",   // Chloe

  // ─── Lancer ───
  20: "cheerful",   // Cu Chulainn
  21: "saint",      // Elizabeth Bathory (Lancer)
  22: "cool",       // Diarmuid
  23: "cheerful",   // Cu Chulainn (Prototype)
  25: "cheerful",   // Leonidas
  78: "saint",      // Brynhild
  88: "cheerful",   // Scathach
  143: "cool",      // Enkidu
  170: "royal",     // Ereshkigal → tsundere

  // ─── Rider ───
  26: "cool",       // Medusa
  27: "cool",       // Alexander (Kid)
  28: "royal",      // Iskandar
  29: "cheerful",   // Marie Antoinette
  30: "tsundere",   // Boudica
  31: "cheerful",   // Ushiwakamaru
  32: "cheerful",   // Astolfo
  63: "cheerful",   // Francis Drake
  108: "royal",     // Ozymandias
  145: "cheerful",  // Quetzalcoatl

  // ─── Caster ───
  33: "cool",       // Medea
  34: "saint",      // Hans Christian Andersen
  35: "cheerful",   // Shakespeare
  36: "cool",       // Cu Chulainn (Caster)
  37: "cool",       // Zhuge Liang (Waver)
  38: "cool",       // Solomon
  40: "saint",      // Irisviel
  65: "royal",      // Gilgamesh (Caster)
  84: "cool",       // Merlin
  164: "cool",      // Skadi

  // ─── Assassin ───
  42: "assassin",   // Sasaki Kojiro
  43: "assassin",   // Hassan of the Cursed Arm
  44: "cheerful",   // Stheno
  45: "cheerful",   // Mata Hari
  46: "assassin",   // Carmilla
  47: "tsundere",   // Phantom of the Opera
  48: "assassin",   // Jack the Ripper
  49: "assassin",   // EMIYA (Assassin) / Kiritsugu
  50: "cool",       // Shiki Ryougi
  154: "assassin",  // King Hassan

  // ─── Berserker ───
  51: "berserker",  // Heracles
  52: "berserker",  // Lancelot (Berserker)
  53: "berserker",  // Lu Bu
  54: "berserker",  // Spartacus
  55: "berserker",  // Sakata Kintoki
  56: "tsundere",   // Tamamo Cat
  57: "berserker",  // Vlad III
  58: "cheerful",   // Asterios
  59: "berserker",  // Caligula
  60: "berserker",  // Darius III
  61: "berserker",  // Kiyohime → tsundere
  100: "tsundere",  // Ibaraki Douji
  131: "berserker", // Raikou → royal/saint

  // ─── Extra classes ───
  66: "saint",      // Jeanne d'Arc (Ruler)
  67: "avenger",    // Jeanne d'Arc (Alter)
  69: "avenger",    // Angra Mainyu
  70: "avenger",    // Edmond Dantes
  150: "cool",      // Sherlock Holmes
  166: "avenger",   // Antonio Salieri
  184: "cool",      // Qin Shi Huang
  189: "avenger",   // Space Ishtar
};

/** 서번트 성격 조회 */
export function getPersonality(servantId: number, servantClass: ServantClass): PersonalityTag {
  if (PERSONALITY_OVERRIDES[servantId]) return PERSONALITY_OVERRIDES[servantId];
  return CLASS_DEFAULT_PERSONALITY[servantClass] ?? "cool";
}

/** 초기 호감도 조회 */
export function getInitialAffection(servantId: number, servantClass: ServantClass, isCatalyst: boolean): number {
  const personality = getPersonality(servantId, servantClass);
  const base = INITIAL_AFFECTION[personality];
  return isCatalyst ? Math.min(base + 10, 100) : base;
}
