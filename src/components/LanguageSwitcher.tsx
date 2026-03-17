import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "EN" },
  { code: "ja", label: "日本語" },
] as const;

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1 text-xs opacity-40 hover:opacity-80 transition-opacity">
      {LANGUAGES.map(({ code, label }, i) => (
        <span key={code}>
          {i > 0 && <span className="text-gray-600 mx-0.5">|</span>}
          <button
            onClick={() => changeLanguage(code)}
            className={`cursor-pointer transition-colors ${
              i18n.language === code
                ? "text-gold font-bold"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}
