import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { CombatResult as CombatResultType, TRPGGameState } from "../../engine/types";
import { CLASS_COLORS, getServantTotalScore } from "../../data/types";
import { useServantResolver } from "../../contexts/ServantDataContext";

interface Props {
  result: CombatResultType;
  playerServantId: number;
  state: TRPGGameState;
  onContinue: () => void;
  hideButton?: boolean;
}

export default function CombatResult({ result, playerServantId, state, onContinue, hideButton }: Props) {
  const { t } = useTranslation("trpg");
  const resolve = useServantResolver();

  const playerWon = result.winner?.id === playerServantId;
  const isDraw = result.isDraw;

  // Determine combatants for portraits
  const playerServant = state.servantMap[playerServantId];
  // 무승부 시 winner/loser 둘 다 null → currentEncounter 또는 descriptionParams에서 적 찾기
  let enemyServant = result.winner?.id === playerServantId ? result.loser : result.winner;
  if (!enemyServant && state.currentEncounter) {
    enemyServant = state.servantMap[state.currentEncounter.enemyId] ?? null;
  }
  if (!enemyServant && result.descriptionParams) {
    // drawResult의 params에서 a/b 이름으로 적 찾기
    const names = [result.descriptionParams.a, result.descriptionParams.b];
    for (const id of Object.keys(state.servantMap)) {
      const s = state.servantMap[Number(id)];
      if (s && s.id !== playerServantId && names.includes(s.name)) {
        enemyServant = s;
        break;
      }
    }
  }
  const resolvedPlayer = resolve(playerServant);
  const resolvedEnemy = enemyServant ? resolve(enemyServant) : null;

  const playerColor = CLASS_COLORS[playerServant.class];
  const enemyColor = enemyServant ? CLASS_COLORS[enemyServant.class] : "#666";

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t("combat.title")}</p>

      {/* Face-off portraits (#4 + #13) */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {/* Player portrait */}
        <motion.div
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div
            className="w-16 h-16 rounded-full overflow-hidden border-2"
            style={{
              borderColor: playerColor,
              boxShadow: playerWon ? `0 0 12px ${playerColor}60` : "none",
            }}
          >
            {resolvedPlayer.imageUrl ? (
              <img src={resolvedPlayer.imageUrl} alt={resolvedPlayer.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: `${playerColor}20` }}>⚔</div>
            )}
          </div>
          <p className="text-[10px] mt-1 font-bold" style={{ color: playerColor }}>{resolvedPlayer.name}</p>
          <p className="text-[9px] text-gray-600">{playerServant.class} ({getServantTotalScore(playerServant)})</p>
        </motion.div>

        {/* VS */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-lg font-bold text-gray-600"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          VS
        </motion.div>

        {/* Enemy portrait */}
        <motion.div
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div
            className="w-16 h-16 rounded-full overflow-hidden border-2"
            style={{
              borderColor: enemyColor,
              boxShadow: !playerWon && !isDraw ? `0 0 12px ${enemyColor}60` : "none",
            }}
          >
            {resolvedEnemy?.imageUrl ? (
              <img src={resolvedEnemy.imageUrl} alt={resolvedEnemy.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: `${enemyColor}20` }}>⚔</div>
            )}
          </div>
          <p className="text-[10px] mt-1 font-bold" style={{ color: enemyColor }}>{resolvedEnemy?.name ?? "???"}</p>
          <p className="text-[9px] text-gray-600">{enemyServant?.class ?? ""}{enemyServant ? ` (${getServantTotalScore(enemyServant)})` : ""}</p>
        </motion.div>
      </div>

      {/* Result with animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="mb-4"
      >
        {isDraw ? (
          <p className="text-lg font-bold text-gray-400">{t("combat.draw")}</p>
        ) : (
          <p
            className="text-lg font-bold"
            style={{ color: playerWon ? "#4ade80" : "#f87171" }}
          >
            {playerWon
              ? t("combat.victory", { name: resolve(result.winner!).name })
              : t("combat.defeat")}
          </p>
        )}
      </motion.div>

      {/* Impact effect on loser */}
      {!isDraw && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${playerWon ? "70%" : "30%"} 50%, rgba(255,74,74,0.15), transparent 60%)`,
          }}
        />
      )}

      {/* Win rate */}
      <p className="text-xs text-gray-600 mb-3">
        {t("combat.winRate", { rate: Math.round(result.winProbabilityA * 100) })}
      </p>

      {/* Skill effects */}
      {result.skillEffects.length > 0 && (
        <div className="mb-4 space-y-1">
          {result.skillEffects.map((effect, i) => (
            <p key={i} className="text-xs text-magic-blue">
              {t(effect.key.startsWith("trpg:") ? effect.key : `simulation:${effect.key}`, effect.params)}
            </p>
          ))}
        </div>
      )}

      {!hideButton && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onContinue}
          className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {t("nightEnd.continue")}
        </motion.button>
      )}
    </div>
  );
}
