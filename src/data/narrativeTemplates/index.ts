/**
 * Narrative template language selector
 *
 * Imports per-language template modules and exports a getter
 * that returns the correct module based on i18n.language.
 */
import i18n from "../../i18n";
import * as ko from "./ko";
import * as en from "./en";
import * as ja from "./ja";

type TemplateModule = {
  ENCOUNTER_TEMPLATES: typeof ko.ENCOUNTER_TEMPLATES;
  CLASH_TEMPLATES: typeof ko.CLASH_TEMPLATES;
  SKILL_TEMPLATES: typeof ko.SKILL_TEMPLATES;
  NP_TEMPLATES: typeof ko.NP_TEMPLATES;
  SPECIAL_ATTACK_TEMPLATES: typeof ko.SPECIAL_ATTACK_TEMPLATES;
  RESULT_TEMPLATES: typeof ko.RESULT_TEMPLATES;
  DEFEAT_CRISIS_TEMPLATES: typeof ko.DEFEAT_CRISIS_TEMPLATES;
  ESCAPE_ATTEMPT_TEMPLATES: typeof ko.ESCAPE_ATTEMPT_TEMPLATES;
  AREA_EXPLORATION_TEMPLATES: Record<string, string[]>;
  AREA_EXPLORATION_HIDE: Record<string, string[]>;
  AREA_EXPLORATION_GUARD: Record<string, string[]>;
  TERRITORY_CREATION_NARRATION: Record<string, string[]>;
  TERRITORY_CREATION_OVERRIDES: Record<number, string>;
  ENCOUNTER_DETAIL_TEMPLATES: Record<string, Record<string, string[]>>;
  COUNTER_SEAL_COMBAT_TEMPLATES: typeof ko.COUNTER_SEAL_COMBAT_TEMPLATES;
  INTERVENTION_TEMPLATES: typeof ko.INTERVENTION_TEMPLATES;
  FALLBACK_HIDE: string;
  FALLBACK_GUARD: string;
  FALLBACK_EXPLORE: string;
};
const modules: Record<string, TemplateModule> = { ko, en, ja };

/** Get all narrative templates for the current language */
export function getTemplates(): TemplateModule {
  return modules[i18n.language] ?? modules.ko;
}

// ─── 유틸리티: 오버라이드 우선 조회 ───

export function pickTemplate(
  pool: string[],
  overrides: Record<number, string[]>,
  servantId: number,
): string {
  const overridePool = overrides[servantId];
  if (overridePool?.length) {
    return overridePool[Math.floor(Math.random() * overridePool.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
