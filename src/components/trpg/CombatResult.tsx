import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { CombatResult as CombatResultType, TRPGGameState } from "../../engine/types";
import { CLASS_COLORS, getServantTotalScore } from "../../data/types";
import { useServantResolver } from "../../contexts/ServantDataContext";
import { generateBattleNarrative } from "../../engine/narrativeGenerator";
import type { NarrativeLine } from "../../engine/narrativeFormatter";
import { getTier, TIER_LABELS_KO } from "../../engine/affection";
import TypewriterLog from "../simulation/TypewriterLog";

interface Props {
  result: CombatResultType;
  playerServantId: number;
  state: TRPGGameState;
  onContinue: () => void;
  hideButton?: boolean;
  /** 패배 위기 등에서 결과 텍스트를 덮어쓸 때 */
  overrideResultText?: string;
}

export default function CombatResult({ result, playerServantId, state, onContinue, hideButton, overrideResultText }: Props) {
  const { t } = useTranslation("trpg");
  const resolve = useServantResolver();
  const [narrativeDone, setNarrativeDone] = useState(false);

  const playerWon = result.winner?.id === playerServantId;
  const isDraw = result.isDraw;

  const playerServant = state.servantMap[playerServantId];
  let enemyServant = result.winner?.id === playerServantId ? result.loser : result.winner;
  if (!enemyServant && state.currentEncounter) {
    enemyServant = state.servantMap[state.currentEncounter.enemyId] ?? null;
  }
  if (!enemyServant && result.descriptionParams) {
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

  // 전투 서사 생성
  const narrativeLines: NarrativeLine[] = useMemo(() => {
    if (!enemyServant) return [];
    try {
      let intentMatchup: "hunt_hunt" | "hunt_guard" | "ambush" | "detected" = "hunt_hunt";
      if (state.currentEncounter?.isAmbush) {
        intentMatchup = "ambush";
      } else if (state.playerIntent === "guard") {
        intentMatchup = "hunt_guard";
      }
      const lines = generateBattleNarrative({
        servantA: playerServant,
        servantB: enemyServant,
        combatResult: result,
        day: state.day,
        intentMatchup,
        isPlayerInvolved: true,
      });

      // 최종 전투 승리 시 추가 대사
      if (state.isFinished && playerWon && result.loser) {
        lines.push({
          text: `적 ${resolve(result.loser).name}를 쓰러뜨리고, 제${state.day}차 성배전쟁의 승자가 결정났다.`,
          effect: "np_glow",
          speed: "slow",
          delay: 800,
        });
      }

      return lines;
    } catch {
      return [];
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const showResult = narrativeDone || narrativeLines.length === 0;

  // 호감도 변화 메시지 생성
  const affectionMessage = useMemo(() => {
    const playerMaster = state.masters.find(m => m.isPlayer);
    if (!playerMaster) return null;
    const tier = getTier(playerMaster.affection);
    const tierLabel = TIER_LABELS_KO[tier];
    const name = resolvedPlayer.name;

    if (isDraw) return null;
    if (playerWon) {
      const delta = Math.abs(result.winProbabilityA - 0.5) > 0.15 ? 3 : 5;
      return { text: `전투를 승리했다! ${name}은(는) 마스터를 더욱 깊이 신뢰하게 된다.`, delta: `${tierLabel}+${delta}`, positive: true };
    } else {
      return { text: `${name}은(는) 패배에 불안한 표정을 짓고 있다.`, delta: `${tierLabel}-3`, positive: false };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t("combat.title")}</p>

      {/* Face-off portraits */}
      <div className="flex items-center justify-center gap-4 mb-4">
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

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-lg font-bold text-gray-600"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          VS
        </motion.div>

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

      {/* 전투 서사 — 한 글자씩 타이프라이터 */}
      {narrativeLines.length > 0 && (
        <TypewriterLog
          lines={narrativeLines}
          onComplete={() => setNarrativeDone(true)}
        />
      )}

      {/* 결과 — 서사 완료 후 표시 */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-3 mt-4">
              {overrideResultText ? (
                <p className="text-lg font-bold" style={{ color: "#f87171" }}>{overrideResultText}</p>
              ) : isDraw ? (
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
            </div>

            <p className="text-xs text-gray-600 mb-2">
              {t("combat.winRate", { rate: Math.round(result.winProbabilityA * 100) })}
            </p>

            {/* 호감도 변화 */}
            {affectionMessage && !overrideResultText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-3 p-2 rounded-lg text-xs"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <p className="text-gray-400">{affectionMessage.text}</p>
                <p
                  className="text-[10px] font-bold mt-0.5"
                  style={{ color: affectionMessage.positive ? "#4ade80" : "#f87171" }}
                >
                  ({affectionMessage.delta})
                </p>
              </motion.div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
