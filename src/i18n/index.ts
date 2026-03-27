import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { fixParticles } from "../utils/josa";

// 한국어 조사 후처리 플러그인 — (이)가, (은)는 등을 자동으로 올바른 조사로 변환
const koreanParticlePostProcessor = {
  type: "postProcessor" as const,
  name: "koreanParticles",
  process(value: string, _key: string | string[], _options: unknown, translator: { language: string }) {
    if (translator.language === "ko") return fixParticles(value);
    return value;
  },
};

import koCommon from "./locales/ko/common.json";
import koIncantation from "./locales/ko/incantation.json";
import koSimulation from "./locales/ko/simulation.json";
import koTrpg from "./locales/ko/trpg.json";
import enCommon from "./locales/en/common.json";
import enIncantation from "./locales/en/incantation.json";
import enSimulation from "./locales/en/simulation.json";
import enTrpg from "./locales/en/trpg.json";
import jaCommon from "./locales/ja/common.json";
import jaIncantation from "./locales/ja/incantation.json";
import jaSimulation from "./locales/ja/simulation.json";
import jaTrpg from "./locales/ja/trpg.json";

function detectLanguage(): string {
  const stored = localStorage.getItem("lang");
  if (stored && ["ko", "en", "ja"].includes(stored)) return stored;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("ko")) return "ko";
  return "ko";
}

i18n.use(koreanParticlePostProcessor).use(initReactI18next).init({
  lng: detectLanguage(),
  fallbackLng: "ko",
  ns: ["common", "incantation", "simulation", "trpg"],
  defaultNS: "common",
  resources: {
    ko: { common: koCommon, incantation: koIncantation, simulation: koSimulation, trpg: koTrpg },
    en: { common: enCommon, incantation: enIncantation, simulation: enSimulation, trpg: enTrpg },
    ja: { common: jaCommon, incantation: jaIncantation, simulation: jaSimulation, trpg: jaTrpg },
  },
  interpolation: { escapeValue: false },
  postProcess: ["koreanParticles"],
});

export default i18n;
