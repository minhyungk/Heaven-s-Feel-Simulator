import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Servant } from "../../data/types";
import type { TRPGGameState, TileId } from "../../engine/types";
import { getMovablePositions, getTileNames, getAreaEffect } from "../../engine/map";
import { getSkillPrefixes } from "../../i18n/skillKeys";
import { findClassSkillRank } from "../../engine/combat";
import i18n from "../../i18n";

interface Props {
  state: TRPGGameState;
  playerServant: Servant;
  onSelect: (target: TileId) => void;
}

export default function MovementSelection({ state, playerServant, onSelect }: Props) {
  const { t } = useTranslation("trpg");
  const tileNames = getTileNames(i18n.language);
  const prefixes = getSkillPrefixes(i18n.language) ;

  const playerMaster = state.masters.find(m => m.isPlayer);
  const currentPos = playerMaster?.position ?? "bridge";

  const reachable = useMemo(
    () => getMovablePositions(currentPos, playerServant, prefixes),
    [currentPos, playerServant, prefixes],
  );

  const hasRiding = findClassSkillRank(playerServant, prefixes.riding) !== null;

  return (
    <div>
      <p className="text-sm text-gray-400 text-center mb-2 uppercase tracking-wider">{t("movement.title")}</p>
      {hasRiding && (
        <p className="text-[10px] text-magic-blue text-center mb-3">{t("movement.ridingBonus")}</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {reachable.map(tileId => {
          const isCurrent = tileId === currentPos;
          const effect = getAreaEffect(tileId);

          return (
            <motion.button
              key={tileId}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(tileId)}
              className="p-3 rounded-lg border bg-transparent cursor-pointer transition-all text-center"
              style={{
                borderColor: isCurrent ? "#ffd70066" : "#ffffff15",
                background: isCurrent ? "rgba(255,215,0,0.05)" : "transparent",
              }}
            >
              <p className="text-xs font-bold text-gray-300">{tileNames[tileId]}</p>
              {isCurrent && <p className="text-[10px] text-gold mt-0.5">{t("movement.stay")}</p>}
              {effect.type !== "none" && (
                <p className="text-[10px] text-gray-600 mt-0.5">{t(effect.description)}</p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
