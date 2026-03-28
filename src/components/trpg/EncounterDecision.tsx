import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Servant } from "../../data/types";
import { CLASS_COLORS, getServantTotalScore, calcWinRate } from "../../data/types";
import type { TRPGGameState } from "../../engine/types";
import { calcEscapeChance } from "../../engine/escape";
import { getSkillPrefixes } from "../../i18n/skillKeys";
import { useServantResolver } from "../../contexts/ServantDataContext";
import i18n from "../../i18n";

interface Props {
  state: TRPGGameState;
  playerServant: Servant;
  onDecision: (fight: boolean) => void;
  onUseSeal: (sealType: string) => void;
}

export default function EncounterDecision({ state, playerServant, onDecision, onUseSeal }: Props) {
  const { t } = useTranslation("trpg");
  const resolve = useServantResolver();
  const prefixes = getSkillPrefixes(i18n.language) ;

  const encounter = state.currentEncounter!;
  const enemyServant = state.servantMap[encounter.enemyId];
  const resolvedEnemy = resolve(enemyServant);
  const playerMaster = state.masters.find(m => m.isPlayer)!;
  const classColor = CLASS_COLORS[enemyServant.class];

  const escapeChance = Math.round(calcEscapeChance(playerServant, enemyServant, prefixes) * 100);
  const enemyMaster = state.masters.find(m => m.servantId === encounter.enemyId);

  // 조우 중이므로 적 정보를 강제로 표시 (안개 갱신은 결정 후에 이루어지지만 조우 화면에서는 보여야 함)
  const showName = true;
  const showClass = true;
  const showStats = true;
  const displayName = resolvedEnemy.name;

  // Stat totals with penalties
  const playerScore = getServantTotalScore(playerServant);
  const enemyScore = getServantTotalScore(enemyServant);
  const playerPenalty = playerMaster.escapePenalty;
  const enemyPenalty = enemyMaster?.escapePenalty ?? 0;
  const effectivePlayerScore = playerScore - playerPenalty + (playerMaster.manaStatBonus ?? 0);
  const effectiveEnemyScore = enemyScore - enemyPenalty;
  const winRate = Math.round(calcWinRate(effectivePlayerScore, effectiveEnemyScore) * 100);

  return (
    <div className="text-center">
      <p className="text-xs text-magic-red uppercase tracking-wider mb-2">
        {encounter.isAmbush ? t("encounter.ambushTitle") : t("encounter.title")}
      </p>
      {encounter.isAmbush && (
        <p className="text-xs text-magic-blue mb-2">{t("encounter.ambushMessage", { class: enemyServant.class })}</p>
      )}

      {/* Enemy display */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div
          className="w-14 h-14 rounded-full overflow-hidden border-2"
          style={{ borderColor: showClass ? classColor : "#666" }}
        >
          {showName && resolvedEnemy.imageUrl ? (
            <img src={resolvedEnemy.imageUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-lg"
              style={{ background: showClass ? `${classColor}20` : "#222" }}
            >
              ?
            </div>
          )}
        </div>
        <div className="text-left">
          <p className="text-sm font-bold" style={{ color: showClass ? classColor : "#888" }}>
            {displayName}
          </p>
          {showClass && (
            <p className="text-xs text-gray-500">
              {enemyServant.class}
              {showStats && (
                <span className="text-gray-400 ml-1">
                  ({enemyScore}{enemyPenalty > 0 && <span className="text-magic-red"> -{enemyPenalty}</span>})
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Stats display (#3) */}
      {showStats && (
        <div className="grid grid-cols-6 gap-1 mb-3 text-[10px]">
          {([
            ["strength", "STR"], ["endurance", "END"], ["agility", "AGI"],
            ["mana", "MANA"], ["luck", "LUCK"], ["np", "NP"],
          ] as const).map(([key, label]) => (
            <div key={key} className="text-center">
              <span className="text-gray-500 text-[12px]">{label}</span>
              <p className="text-gray-400 text-[10px] font-bold">{enemyServant.stats[key]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stat comparison + penalty indicators */}
      {(playerPenalty > 0 || enemyPenalty > 0) && (
        <div className="mb-2 space-y-0.5">
          {playerPenalty > 0 && (
            <p className="text-[10px] text-magic-red text-center">{t("encounter.escapePenalty", { name: resolve(playerServant).name, penalty: playerPenalty })}</p>
          )}
          {enemyPenalty > 0 && (
            <p className="text-[10px] text-magic-red text-center">{t("encounter.escapePenalty", { name: resolvedEnemy.name, penalty: enemyPenalty })}</p>
          )}
        </div>
      )}

      {/* Win rate + Enemy seals (#3, #12) */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <p className="text-xs text-gray-500">
          {t("encounter.winRate", { rate: winRate })}
        </p>
        {enemyMaster && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-600">{t("counterSeal.enemySeals")}:</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: i < enemyMaster.commandSeals ? "#ff4a4a" : "#333",
                  border: `1px solid ${i < enemyMaster.commandSeals ? "#ff6b6b" : "#555"}`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-4">
        {t("encounter.message", { class: showClass ? enemyServant.class : "???" })}
      </p>

      {/* Decision buttons */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255,74,74,0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDecision(true)}
            className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-magic-red bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
          >
            {t("encounter.fight")}
          </motion.button>
          {state.day < 7 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDecision(false)}
              className="px-8 py-3 text-sm font-bold rounded-lg border border-gray-600 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
            >
              {t("encounter.escape")}
              <span className="text-[10px] text-gray-600 ml-1">({escapeChance}%)</span>
            </motion.button>
          )}
        </div>

        {state.day >= 7 && (
          <p className="text-[10px] text-magic-red text-center">{t("encounter.noEscape")}</p>
        )}

        {/* Command Seal options */}
        {playerMaster.commandSeals > 0 && (
          <div className="flex gap-2 justify-center mt-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onUseSeal("boost")}
              className="px-3 py-2 text-[10px] font-bold rounded-lg border border-magic-red/40 bg-transparent text-magic-red/70 cursor-pointer hover:bg-magic-red/5 transition-colors whitespace-pre-line leading-tight"
            >
              {t("encounter.sealBoost").replace(" (", "\n(")}
            </motion.button>
            {state.day < 7 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onUseSeal("escape")}
                className="px-3 py-2 text-[10px] font-bold rounded-lg border border-magic-blue/40 bg-transparent text-magic-blue/70 cursor-pointer hover:bg-magic-blue/5 transition-colors whitespace-pre-line leading-tight"
              >
                {t("encounter.sealEscape").replace(" (", "\n(")}
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onUseSeal("npFullPower")}
              className="px-3 py-2 text-[10px] font-bold rounded-lg border border-gold/40 bg-transparent text-gold/70 cursor-pointer hover:bg-gold/5 transition-colors whitespace-pre-line leading-tight"
            >
              {t("encounter.sealNP").replace(" (", "\n(")}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
