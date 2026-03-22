import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { TileId, AreaEffect } from "../../engine/types";

interface Props {
  tileId: TileId;
  name: string;
  effect: AreaEffect;
  isPlayerHere: boolean;
  playerImageUrl?: string;
  occupantClasses: string[];
  isHighlighted: boolean;
  onClick?: () => void;
}

const EFFECT_COLORS: Record<string, string> = {
  leyline: "#8b5cf6",
  stealth: "#22c55e",
  encounter: "#ef4444",
  neutral: "#eab308",
  exposed: "#f97316",
  none: "#4a9eff",
};

export default function MapTile({ name, effect, isPlayerHere, playerImageUrl, occupantClasses, isHighlighted, onClick }: Props) {
  const { t } = useTranslation("trpg");
  const borderColor = isPlayerHere ? "#ffd700" : isHighlighted ? "#4a9eff" : "#333";
  const bgColor = isPlayerHere ? "rgba(255,215,0,0.08)" : isHighlighted ? "rgba(74,158,255,0.08)" : "rgba(255,255,255,0.02)";

  return (
    <div
      className={`rounded-lg p-2 text-center transition-all ${onClick ? "cursor-pointer hover:brightness-125" : ""}`}
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        minHeight: 70,
      }}
      onClick={onClick}
    >
      <p className="text-xs font-bold mb-1" style={{ color: EFFECT_COLORS[effect.type] ?? "#888" }}>
        {name}
      </p>

      {/* Occupants */}
      <div className="flex flex-wrap gap-0.5 justify-center items-center">
        {isPlayerHere && (
          <motion.div
            layoutId="player-map-icon"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex items-center gap-0.5"
          >
            {playerImageUrl ? (
              <div className="w-5 h-5 rounded-full overflow-hidden border border-gold" style={{ boxShadow: "0 0 6px rgba(255,215,0,0.4)" }}>
                <img src={playerImageUrl} alt="YOU" className="w-full h-full object-cover" />
              </div>
            ) : (
              <span className="text-[10px] px-1 rounded bg-gold/20 text-gold font-bold">YOU</span>
            )}
          </motion.div>
        )}
        {occupantClasses.map((cls, i) => (
          <span
            key={i}
            className="text-[10px] px-1 rounded font-bold"
            style={{
              background: cls === "???" ? "rgba(255,74,74,0.15)" : "rgba(255,255,255,0.08)",
              color: cls === "???" ? "#ff6b6b" : "#ccc",
              border: cls === "???" ? "1px solid rgba(255,74,74,0.3)" : "none",
              animation: cls === "???" ? "pulse 2s ease-in-out infinite" : "none",
            }}
          >
            {cls === "???" ? "⚔ ???" : cls}
          </span>
        ))}
      </div>

      {/* Area effect description */}
      {effect.type !== "none" && (
        <p className="mt-0.5 text-[10px] leading-tight" style={{ color: EFFECT_COLORS[effect.type] }}>
          {t(`area.${effect.type}`)}
        </p>
      )}
    </div>
  );
}
