/**
 * Memoir template language selector
 *
 * Follows the same pattern as narrativeTemplates/index.ts
 */
import i18n from "../../i18n";
import * as ko from "./ko";
import * as en from "./en";
import * as ja from "./ja";

export type MemoirTemplateModule = {
  MEMOIR_OPENING: typeof ko.MEMOIR_OPENING;
  MEMOIR_MILESTONES: typeof ko.MEMOIR_MILESTONES;
  MEMOIR_CONNECTORS: typeof ko.MEMOIR_CONNECTORS;
  MEMOIR_CLOSING: typeof ko.MEMOIR_CLOSING;
  MEMOIR_WISH: typeof ko.MEMOIR_WISH;
};

const modules: Record<string, MemoirTemplateModule> = { ko, en, ja };

export function getMemoirTemplates(): MemoirTemplateModule {
  return modules[i18n.language] ?? modules.ko;
}
