import { useTranslation } from "react-i18next";
import { CLASS_COLORS } from "../../data/types";
import type { TRPGGameState } from "../../engine/types";
import { useServantResolver } from "../../contexts/ServantDataContext";

interface Props {
  state: TRPGGameState;
}

export default function SurvivorsPanel({ state }: Props) {
  const { t } = useTranslation("trpg");
  const resolve = useServantResolver();

  return (
    <div className="w-full max-w-2xl mb-4">
      <p className="text-xs text-gray-500 text-center mb-2 uppercase tracking-wider">{t("survivors.title")}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {state.masters.map(m => {
          const servant = state.servantMap[m.servantId];
          const resolved = resolve(servant);
          const isPlayer = m.servantId === state.playerServantId;
          const enemyInfo = state.enemyInfo[m.servantId];
          // What to show?
          let displayName: string;
          let displayClass: string | null = null;
          if (isPlayer) {
            displayName = resolved.name;
            displayClass = servant.class;
          } else if (!enemyInfo || enemyInfo.fogLevel === "unknown") {
            displayName = t("survivors.unknown");
          } else if (enemyInfo.fogLevel === "classRevealed") {
            displayName = t("survivors.classRevealed", { class: enemyInfo.knownClass });
            displayClass = enemyInfo.knownClass;
          } else {
            displayName = resolved.name;
            displayClass = servant.class;
          }

          const color = displayClass ? CLASS_COLORS[displayClass as keyof typeof CLASS_COLORS] ?? "#666" : "#666";

          return (
            <div
              key={m.servantId}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
              style={{
                opacity: m.isAlive ? 1 : 0.3,
                border: `1px solid ${isPlayer ? "#ffd700" : color}44`,
                background: m.isAlive ? `${color}10` : "transparent",
                textDecoration: m.isAlive ? "none" : "line-through",
              }}
            >
              {/* Face */}
              <div
                className="w-6 h-6 rounded-full overflow-hidden shrink-0 border"
                style={{ borderColor: color }}
              >
                {(isPlayer || (enemyInfo && (enemyInfo.fogLevel === "statsRevealed" || enemyInfo.fogLevel === "fullyRevealed"))) && resolved.imageUrl ? (
                  <img src={resolved.imageUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ background: `${color}20` }}>?</div>
                )}
              </div>
              <span className={m.isAlive ? "text-gray-300" : "text-gray-600"}>{displayName}</span>
              {isPlayer && <span className="text-gold text-[10px] font-bold ml-0.5">{t("survivors.you")}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
