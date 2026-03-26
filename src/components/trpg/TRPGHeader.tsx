import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Servant } from "../../data/types";
import { CLASS_COLORS, getServantTotalScore } from "../../data/types";
import type { TRPGGameState } from "../../engine/types";
import { getTileNames } from "../../engine/map";
import i18n from "../../i18n";
import { useServantResolver } from "../../contexts/ServantDataContext";
import AffectionBar from "./AffectionBar";

interface Props {
  state: TRPGGameState;
  playerServant: Servant;
  onClose?: () => void;
}

export default function TRPGHeader({ state, playerServant, onClose }: Props) {
  const { t } = useTranslation("trpg");
  const resolve = useServantResolver();
  const resolved = resolve(playerServant);
  const tileNames = getTileNames(i18n.language);

  const playerMaster = state.masters.find(m => m.servantId === state.playerServantId);
  const classColor = CLASS_COLORS[playerServant.class];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mb-4"
    >
      <div className="rounded-xl p-4" style={{ background: "#0d0d24", border: `1px solid ${classColor}33` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Face */}
            <div
              className="w-12 h-12 rounded-full overflow-hidden border-2"
              style={{ borderColor: classColor }}
            >
              {resolved.imageUrl ? (
                <img src={resolved.imageUrl} alt={resolved.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: `${classColor}20` }}>⚔</div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: classColor }}>{resolved.name}</p>
              <p className="text-xs text-gray-500">
                {playerServant.class}
                {" "}
                <span className="text-gray-400">
                  ({getServantTotalScore(playerServant)}{playerMaster && playerMaster.escapePenalty > 0 && (
                    <span className="text-magic-red"> -{playerMaster.escapePenalty}</span>
                  )})
                </span>
              </p>
            </div>
          </div>

          <div className="text-right flex items-start gap-2">
            <div>
              <p className="text-lg font-bold text-gold" style={{ fontFamily: "var(--font-serif)" }}>
                {t("header.day", { day: state.day })}
                <span className="text-xs text-gray-500 ml-2">
                  {t("action.indicator", { current: state.actionCount + 1, max: 2 })}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {playerMaster && t("header.position", { tile: tileNames[playerMaster.position] })}
              </p>
            </div>
            {onClose && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-2 py-1 text-[10px] rounded border border-gray-700 bg-transparent text-gray-600 cursor-pointer hover:text-gray-400 hover:border-gray-500 transition-colors"
              >
                {t("gameOver.backToDashboard")}
              </motion.button>
            )}
          </div>
        </div>

        {/* Command Seals + Affection */}
        {playerMaster && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <img src="/Command_Seal.webp" alt="영주" className="w-5 h-5 object-contain" style={{ filter: "brightness(1.2)" }} />
              <span className="text-xs text-gray-500">{t("commandSeal.title")}:</span>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full"
                    style={{
                      background: i < playerMaster.commandSeals ? "#ff4a4a" : "#333",
                      border: `1px solid ${i < playerMaster.commandSeals ? "#ff6b6b" : "#555"}`,
                      boxShadow: i < playerMaster.commandSeals ? "0 0 6px rgba(255,74,74,0.4)" : "none",
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-600 ml-1">
                {t("commandSeal.remaining", { count: playerMaster.commandSeals })}
              </span>
            </div>
            <AffectionBar affection={playerMaster.affection} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
