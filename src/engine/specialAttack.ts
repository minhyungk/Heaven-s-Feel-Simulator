import type { Servant } from "../data/types";
import { SERVANT_TRAITS } from "../data/traits";
import { NP_SPECIAL_ATTACKS } from "../data/specialAttacks";
import type { SkillEffect } from "./types";

export interface SpecialAttackResult {
  triggered: boolean;
  multiplier: number;
  matchedTraits: string[];
  skillEffect: SkillEffect | null;
}

/** 특공 보정 계산 */
export function checkSpecialAttack(
  attacker: Servant,
  defender: Servant,
): SpecialAttackResult {
  const npSpecial = NP_SPECIAL_ATTACKS[attacker.id];
  if (!npSpecial) {
    return { triggered: false, multiplier: 1.0, matchedTraits: [], skillEffect: null };
  }

  const defenderTraits = SERVANT_TRAITS[defender.id] ?? [];
  const matchedTraits = npSpecial.targetTraits.filter(t => defenderTraits.includes(t));

  if (matchedTraits.length === 0) {
    return { triggered: false, multiplier: 1.0, matchedTraits: [], skillEffect: null };
  }

  return {
    triggered: true,
    multiplier: npSpecial.multiplier,
    matchedTraits,
    skillEffect: {
      key: "trpg:specialAttack",
      params: {
        attacker: attacker.name,
        defender: defender.name,
        npName: attacker.noblePhantasm.name,
        traits: matchedTraits.join(", "),
        multiplier: `${npSpecial.multiplier}x`,
      },
      servantRefs: { attacker: attacker.id, defender: defender.id },
    },
  };
}
