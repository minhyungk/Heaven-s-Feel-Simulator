import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TRPGGameState } from "../../engine/types";

interface Props {
  state: TRPGGameState;
}

export default function TRPGLogPanel({ state }: Props) {
  const { t } = useTranslation("trpg");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.log.length]);

  if (state.log.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mb-4">
      <p className="text-xs text-gray-500 text-center mb-2 uppercase tracking-wider">
        {t("header.day", { day: state.day })} — Log
      </p>
      <div
        ref={scrollRef}
        className="rounded-xl p-4 max-h-60 overflow-y-auto space-y-1"
        style={{ background: "#0d0d24", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        {state.log.map((entry, i) => {
          let color = "#888";
          if (entry.phase === "combat") color = "#ff4a4a";
          else if (entry.phase === "encounter") color = "#ffd700";
          else if (entry.phase === "escape") color = "#4a9eff";
          else if (entry.phase === "detection") color = "#f97316";
          else if (entry.phase === "commandSeal") color = "#ef4444";
          else if (entry.phase === "elimination") color = "#dc2626";
          else if (entry.phase === "gameOver") color = "#ffd700";
          else if (entry.phase === "madEnhancement") color = "#dc2626";
          else if (entry.phase === "aiCombat") color = "#6b7280";
          else if (entry.phase === "recovery") color = "#4ade80";

          return (
            <p key={i} className="text-xs" style={{ color }}>
              <span className="text-gray-700 mr-1">[{entry.day}]</span>
              {t(entry.key, entry.params)}
            </p>
          );
        })}
      </div>
    </div>
  );
}
