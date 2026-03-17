import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import koCommon from "./locales/ko/common.json";
import koIncantation from "./locales/ko/incantation.json";
import koSimulation from "./locales/ko/simulation.json";
import enCommon from "./locales/en/common.json";
import enIncantation from "./locales/en/incantation.json";
import enSimulation from "./locales/en/simulation.json";
import jaCommon from "./locales/ja/common.json";
import jaIncantation from "./locales/ja/incantation.json";
import jaSimulation from "./locales/ja/simulation.json";

function detectLanguage(): string {
  const stored = localStorage.getItem("lang");
  if (stored && ["ko", "en", "ja"].includes(stored)) return stored;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("ko")) return "ko";
  return "en";
}

i18n.use(initReactI18next).init({
  lng: detectLanguage(),
  fallbackLng: "ko",
  ns: ["common", "incantation", "simulation"],
  defaultNS: "common",
  resources: {
    ko: { common: koCommon, incantation: koIncantation, simulation: koSimulation },
    en: { common: enCommon, incantation: enIncantation, simulation: enSimulation },
    ja: { common: jaCommon, incantation: jaIncantation, simulation: jaSimulation },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
