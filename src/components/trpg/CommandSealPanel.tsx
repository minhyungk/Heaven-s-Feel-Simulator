import { useTranslation } from "react-i18next";

interface Props {
  seals: number;
}

export default function CommandSealPanel({ seals }: Props) {
  const { t } = useTranslation("trpg");

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{t("commandSeal.title")}:</span>
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full"
            style={{
              background: i < seals ? "#ff4a4a" : "#333",
              border: `1px solid ${i < seals ? "#ff6b6b" : "#555"}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
