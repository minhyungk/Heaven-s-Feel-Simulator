import { useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TRPGGameState, LogEntry } from "../../engine/types";
import type { Servant } from "../../data/types";

interface Props {
  state: TRPGGameState;
}

const PHASE_COLORS: Record<string, string> = {
  combat: "#ff4a4a",
  encounter: "#ffd700",
  escape: "#4a9eff",
  detection: "#f97316",
  commandSeal: "#ef4444",
  elimination: "#dc2626",
  gameOver: "#ffd700",
  madEnhancement: "#dc2626",
  aiCombat: "#6b7280",
  recovery: "#4ade80",
};

export default function TRPGLogPanel({ state }: Props) {
  const { t } = useTranslation("trpg");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.log.length]);

  /** Collect revealed servant IDs (player + enemies with statsRevealed or fullyRevealed) */
  const revealedIds = useMemo(() => {
    const ids = new Set<number>();
    ids.add(state.playerServantId);
    for (const info of Object.values(state.enemyInfo)) {
      if (info.fogLevel === "statsRevealed" || info.fogLevel === "fullyRevealed") {
        ids.add(info.servantId);
      }
    }
    return ids;
  }, [state.playerServantId, state.enemyInfo]);

  /** Get unique revealed servants referenced in a log entry */
  function getReferencedServants(entry: LogEntry): Servant[] {
    if (!entry.servantRefs) return [];
    const seen = new Set<number>();
    const result: Servant[] = [];
    for (const id of Object.values(entry.servantRefs)) {
      if (seen.has(id) || !revealedIds.has(id)) continue;
      seen.add(id);
      const s = state.servantMap[id];
      if (s) result.push(s);
    }
    return result;
  }

  if (state.log.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mb-4">
      <p className="text-xs text-gray-500 text-center mb-2 uppercase tracking-wider">
        {t("header.day", { day: state.day })} — Log
      </p>
      <div
        ref={scrollRef}
        className="rounded-xl p-4 max-h-60 overflow-y-auto space-y-1.5"
        style={{ background: "#0d0d24", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        {state.log.map((entry, i) => {
          const color = PHASE_COLORS[entry.phase] ?? "#888";
          const servants = getReferencedServants(entry);

          return (
            <div key={i} className="flex items-center gap-1.5">
              {servants.length > 0 && (
                <div className="flex -space-x-1 shrink-0">
                  {servants.map((s) => (
                    <div
                      key={s.id}
                      className="w-5 h-5 rounded-full overflow-hidden border border-white/20"
                    >
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center text-[8px] text-gray-500">?</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs min-w-0" style={{ color }}>
                <span className="text-gray-700 mr-1">[{entry.day}]</span>
                {t(entry.key, entry.params)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
