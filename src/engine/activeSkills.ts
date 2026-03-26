import type { Servant } from "../data/types";
import type { SkillEffect } from "./types";

// ─── 타입 정의 ───

export type SkillTag =
  | "atk_boost" | "def_boost" | "agi_boost"
  | "survival" | "mental_resist" | "charm"
  | "heal" | "stealth_boost" | "detect_boost"
  | "np_boost" | "debuff_enemy" | "special";

export type SkillActivation = "passive" | "active";
export type SkillTrigger = "always" | "battle_start" | "on_attack" | "on_defend" | "on_np" | "on_defeat";

export interface ProcessedSkill {
  name: string;
  tags: SkillTag[];
  rank: string;
  value: number;
  activation: SkillActivation;
  triggerCondition: SkillTrigger;
}

// ─── 랭크 → 수치 변환 ───

const RANK_VALUES: Record<string, number> = {
  "E-": 0.03, "E": 0.05, "E+": 0.07,
  "D-": 0.08, "D": 0.10, "D+": 0.12,
  "C-": 0.13, "C": 0.15, "C+": 0.17,
  "B-": 0.18, "B": 0.20, "B+": 0.22,
  "A-": 0.23, "A": 0.25, "A+": 0.30, "A++": 0.32,
  "EX": 0.35,
};

function rankToValue(rank: string): number {
  return RANK_VALUES[rank] ?? 0.15; // default C rank
}

// ─── 키워드 기반 자동 분류 ───

interface SkillClassification {
  tags: SkillTag[];
  activation: SkillActivation;
  triggerCondition: SkillTrigger;
}

const KEYWORD_RULES: { pattern: RegExp; classification: SkillClassification }[] = [
  // 공격 부스트
  { pattern: /방출|괴력|怪力|魔力放出|Mana Burst|Prana Burst/i, classification: { tags: ["atk_boost"], activation: "active", triggerCondition: "on_attack" } },
  { pattern: /카리스마|Charisma|カリスマ/i, classification: { tags: ["atk_boost"], activation: "passive", triggerCondition: "always" } },
  // 민첩/회피
  { pattern: /직감|直感|Instinct|心眼|심안|Eye of the Mind|천리안|千里眼|Clairvoyance/i, classification: { tags: ["agi_boost"], activation: "passive", triggerCondition: "always" } },
  { pattern: /矢避け|야비|Protection from Arrows/i, classification: { tags: ["def_boost", "agi_boost"], activation: "passive", triggerCondition: "on_defend" } },
  // 방어 부스트
  { pattern: /방어|Protection|守護|加護|Blessing/i, classification: { tags: ["def_boost"], activation: "passive", triggerCondition: "always" } },
  // 생존
  { pattern: /전투속행|戦闘続行|Battle Continuation|仕切り直し|Disengage|속행/i, classification: { tags: ["survival"], activation: "active", triggerCondition: "on_defeat" } },
  { pattern: /가츠|ガッツ|Guts/i, classification: { tags: ["survival"], activation: "active", triggerCondition: "on_defeat" } },
  // 은신
  { pattern: /변화|変化|Shapeshift|은형|隠形|Concealment/i, classification: { tags: ["stealth_boost"], activation: "active", triggerCondition: "battle_start" } },
  // 탐지
  { pattern: /간파|看破|Discernment|감지|Detection/i, classification: { tags: ["detect_boost"], activation: "passive", triggerCondition: "always" } },
  // 정신내성
  { pattern: /精神|정신|Mental|勇猛|용맹|Bravery/i, classification: { tags: ["mental_resist", "atk_boost"], activation: "passive", triggerCondition: "always" } },
  // 매혹
  { pattern: /매혹|魅了|Charm|美|Beauty|女神|Goddess/i, classification: { tags: ["charm"], activation: "active", triggerCondition: "battle_start" } },
  // 치유
  { pattern: /치유|治癒|Heal|再生|Regeneration/i, classification: { tags: ["heal"], activation: "active", triggerCondition: "on_defend" } },
  // NP 부스트
  { pattern: /황금률|黄金律|Golden Rule/i, classification: { tags: ["np_boost"], activation: "passive", triggerCondition: "always" } },
  // 디버프
  { pattern: /저주|呪い|Curse|공포|Terror|恐怖|毒|독/i, classification: { tags: ["debuff_enemy"], activation: "active", triggerCondition: "on_attack" } },
];

function classifySkill(skillName: string): SkillClassification | null {
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(skillName)) {
      return rule.classification;
    }
  }
  return null;
}

// ─── 서번트 스킬 처리 ───

export function processServantSkills(servant: Servant): ProcessedSkill[] {
  const skills: ProcessedSkill[] = [];

  for (const skill of servant.personalSkills) {
    const classification = classifySkill(skill.name);
    if (!classification) continue;

    // 스킬 이름에서 랭크 추출
    const rankMatch = skill.name.match(/\s([ABCDE][\+\-]*|EX)\s*$/);
    const rank = rankMatch ? rankMatch[1] : "C";

    skills.push({
      name: skill.name,
      tags: classification.tags,
      rank,
      value: rankToValue(rank),
      activation: classification.activation,
      triggerCondition: classification.triggerCondition,
    });
  }

  return skills;
}

// ─── 전투 보정 계산 ───

export interface SkillCombatModifiers {
  atkBonus: number;
  defBonus: number;
  agiBonus: number;
  survivalChance: number;
  effects: SkillEffect[];
}

export function getPassiveModifiers(skills: ProcessedSkill[], servantName: string, servantId: number): SkillCombatModifiers {
  let atkBonus = 0;
  let defBonus = 0;
  let agiBonus = 0;
  let survivalChance = 0;
  const effects: SkillEffect[] = [];

  for (const skill of skills) {
    if (skill.activation === "passive" || skill.triggerCondition === "always") {
      for (const tag of skill.tags) {
        switch (tag) {
          case "atk_boost": atkBonus += skill.value; break;
          case "def_boost": defBonus += skill.value; break;
          case "agi_boost": agiBonus += skill.value; break;
          case "np_boost": atkBonus += skill.value * 0.5; break;
          case "mental_resist": defBonus += skill.value * 0.3; break;
          case "detect_boost": break; // 탐지는 전투력에 반영 안 함
          case "stealth_boost": break; // 은신도 전투력에 반영 안 함
        }
      }
    }
  }

  // active 스킬 확률 발동 (battle_start, on_attack, on_defend)
  for (const skill of skills) {
    if (skill.activation !== "active") continue;
    // 발동 확률 = value (E:5%, A:25%, EX:35%)
    if (Math.random() > skill.value * 2) continue; // 발동 실패

    for (const tag of skill.tags) {
      switch (tag) {
        case "atk_boost":
          atkBonus += skill.value;
          effects.push({ key: "trpg:skill.atkBoost", params: { name: servantName, skill: skill.name }, servantRefs: { name: servantId } });
          break;
        case "def_boost":
          defBonus += skill.value;
          effects.push({ key: "trpg:skill.defBoost", params: { name: servantName, skill: skill.name }, servantRefs: { name: servantId } });
          break;
        case "survival":
          survivalChance = Math.max(survivalChance, skill.value);
          break;
        case "charm":
          // 매혹: 적 민첩 감소 효과 (전투력 보정으로 반영)
          atkBonus += skill.value * 0.5;
          effects.push({ key: "trpg:skill.charm", params: { name: servantName, skill: skill.name }, servantRefs: { name: servantId } });
          break;
        case "heal":
          defBonus += skill.value * 0.5;
          break;
      }
    }
  }

  return { atkBonus, defBonus, agiBonus, survivalChance, effects };
}

/** 패배 시 생존 스킬 체크 (survival 태그) */
export function checkSurvivalSkill(skills: ProcessedSkill[], servantName: string, servantId: number): { survived: boolean; effect: SkillEffect | null } {
  for (const skill of skills) {
    if (!skill.tags.includes("survival")) continue;
    if (skill.triggerCondition !== "on_defeat") continue;
    // 발동 확률 = value * 2 (E:10%, A:50%, EX:70%)
    if (Math.random() < skill.value * 2) {
      return {
        survived: true,
        effect: {
          key: "trpg:skill.survival",
          params: { name: servantName, skill: skill.name },
          servantRefs: { name: servantId },
        },
      };
    }
  }
  return { survived: false, effect: null };
}

/** 전투 보정 합산 → 승률 보정값 */
export function getSkillWinRateBonus(mods: SkillCombatModifiers): number {
  return (mods.atkBonus + mods.defBonus * 0.5 + mods.agiBonus * 0.3);
}
