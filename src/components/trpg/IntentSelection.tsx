import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Intent } from "../../engine/types";

interface Props {
  onSelect: (intent: Intent) => void;
}

const INTENT_CONFIG: { intent: Intent; icon: string; color: string }[] = [
  { intent: "hunt", icon: "⚔️", color: "#ef4444" },
  { intent: "guard", icon: "🛡", color: "#3b82f6" },
  { intent: "hide", icon: "👤", color: "#6b7280" },
];

export default function IntentSelection({ onSelect }: Props) {
  const { t } = useTranslation("trpg");

  return (
    <div>
      <p className="text-sm text-gray-400 text-center mb-4 uppercase tracking-wider">{t("intent.title")}</p>
      <div className="grid grid-cols-3 gap-3">
        {INTENT_CONFIG.map(({ intent, icon, color }) => (
          <motion.button
            key={intent}
            whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${color}33` }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(intent)}
            className="p-4 rounded-lg border bg-transparent cursor-pointer transition-all hover:brightness-125"
            style={{ borderColor: `${color}66` }}
          >
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-sm font-bold" style={{ color }}>{t(`intent.${intent}`)}</p>
            <p className="text-[10px] text-gray-500 mt-1">{t(`intent.${intent}Desc`)}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
