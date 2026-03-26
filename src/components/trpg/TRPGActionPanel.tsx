import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Servant } from "../../data/types";
import { CLASS_COLORS } from "../../data/types";
import type { TRPGGameState, Intent } from "../../engine/types";
import { calcEscapeChance } from "../../engine/escape";
import { getSkillPrefixes } from "../../i18n/skillKeys";
import { useServantResolver } from "../../contexts/ServantDataContext";
import i18n from "../../i18n";
import IntentSelection from "./IntentSelection";
import EncounterDecision from "./EncounterDecision";
import CombatResult from "./CombatResult";
import { RESULT_COLORS, RESULT_LABELS_KO, RESULT_LABELS_EN, RESULT_LABELS_JA } from "../../engine/manaSupply";
import type { ManaSupplyResult } from "../../engine/manaSupply";

interface Props {
  state: TRPGGameState;
  playerServant: Servant;
  onSelectIntent: (intent: Intent) => void;
  onEncounterDecision: (fight: boolean) => void;
  onUseCommandSeal: (sealType: string) => void;
  onCounterSealDecision: (useSeal: string | null) => void;
  onDefeatEscapeDecision: (useSeal: boolean) => void;
  onSetWish: (wish: string) => void;
  onAdvancePhase: () => void;
  onClose: () => void;
  onManaSupply?: () => void;
  onSkipManaSupply?: () => void;
}

export default function TRPGActionPanel({
  state, playerServant,
  onSelectIntent, onEncounterDecision,
  onUseCommandSeal, onCounterSealDecision, onDefeatEscapeDecision,
  onSetWish, onAdvancePhase, onClose,
  onManaSupply, onSkipManaSupply,
}: Props) {
  const { t } = useTranslation(["trpg", "simulation"]);
  const resolve = useServantResolver();
  const [wish, setWish] = useState("");

  return (
    <div className="w-full max-w-2xl mb-4">
      <motion.div
        key={state.phase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5 relative overflow-hidden"
        style={{ background: "#0d0d24", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {state.phase === "intentSelection" && (
          <div>
            <p className="text-[10px] text-gray-600 text-center mb-1">
              {t("trpg:action.indicator", { current: state.actionCount + 1, max: 2 })}
            </p>
            <IntentSelection onSelect={onSelectIntent} />
          </div>
        )}

        {state.phase === "movementSelection" && (
          <div>
            <p className="text-sm text-yellow-400 text-center mb-3 uppercase tracking-wider">{t("trpg:tips.title")}</p>
            {state.day >= 7 ? (
              <div className="text-center">
                <p className="text-xs text-magic-red font-bold mb-2">{t("trpg:tips.noEscapeDay7")}</p>
                <p className="text-xs text-gray-500">{t("trpg:movement.current")}: {t("trpg:map.title")}</p>
              </div>
            ) : (
              <p className="text-xs text-magic-blue text-center mb-3">{t("")}</p>
            )}
            <div className="mt-3 space-y-1.5">
              {(["npDeploy", "specialAttack", "escape", "guard", "ambush", "antiMagic", "territory"] as const).map(key => (
                <p key={key} className="text-[12px] text-gray-400 leading-relaxed">
                  • {t(`trpg:tips.${key}`)}
                </p>
              ))}
            </div>
          </div>
        )}

        {state.phase === "forcedBridgeNotice" && (
          <div className="text-center">
            <p className="text-xs text-magic-red uppercase tracking-wider mb-3">{t("trpg:forcedBridge.title")}</p>
            <p className="text-sm text-gray-400 mb-4">{t("trpg:forcedBridge.message")}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAdvancePhase}
              className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-magic-red bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {t("trpg:nightEnd.continue")}
            </motion.button>
          </div>
        )}

        {state.phase === "encounterDecision" && state.currentEncounter && (
          <EncounterDecision
            state={state}
            playerServant={playerServant}
            onDecision={onEncounterDecision}
            onUseSeal={onUseCommandSeal}
          />
        )}

        {state.phase === "combatResult" && state.lastCombatResult && (
          <CombatResult
            result={state.lastCombatResult}
            playerServantId={state.playerServantId}
            state={state}
            onContinue={onAdvancePhase}
          />
        )}

        {/* 패배 시 도주 프롬프트 (7일차 이후는 엔진에서 즉시 게임오버 처리) */}
        {state.phase === "defeatEscapePrompt" && state.currentEncounter && state.lastCombatResult && (
          <div className="text-center">
            <p className="text-xs text-magic-red uppercase tracking-wider mb-3">{t("trpg:defeatEscape.title")}</p>

            <CombatResult
              result={state.lastCombatResult}
              playerServantId={state.playerServantId}
              state={state}
              onContinue={() => {}}
              hideButton
              overrideResultText={t("trpg:defeatEscape.losing")}
            />

            <p className="text-sm text-gray-400 my-4">{t("trpg:defeatEscape.message")}</p>

            <div className="flex flex-col gap-2">
              {(() => {
                const prefixes = getSkillPrefixes(i18n.language);
                const enemyServant = state.servantMap[state.currentEncounter!.enemyId];
                const escapeChance = Math.round(calcEscapeChance(playerServant, enemyServant, prefixes) * 100);
                const playerMaster = state.masters.find(m => m.isPlayer);
                const hasSeals = (playerMaster?.commandSeals ?? 0) > 0;

                return (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onDefeatEscapeDecision(false)}
                      className="px-8 py-3 text-sm font-bold rounded-lg border border-gray-600 bg-transparent text-gray-300 cursor-pointer hover:bg-white/5 transition-colors mx-auto"
                    >
                      {t("trpg:defeatEscape.tryEscape", { chance: escapeChance })}
                    </motion.button>
                    {hasSeals && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onDefeatEscapeDecision(true)}
                        className="px-8 py-3 text-sm font-bold rounded-lg border border-magic-blue/60 bg-transparent text-magic-blue cursor-pointer hover:bg-magic-blue/10 transition-colors mx-auto"
                      >
                        {t("trpg:defeatEscape.sealEscape")}
                      </motion.button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* 플레이어 도주 성공 */}
        {state.phase === "playerEscaped" && (
          <div className="text-center">
            <p className="text-xs text-magic-blue uppercase tracking-wider mb-3">{t("trpg:playerEscaped.title")}</p>
            <p className="text-sm text-gray-400 mb-4">
              {state.escapedViaSeal
                ? t("trpg:playerEscaped.sealMessage")
                : t("trpg:playerEscaped.message")}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAdvancePhase}
              className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {t("trpg:nightEnd.continue")}
            </motion.button>
          </div>
        )}

        {/* #3: 적 서번트 도주 표시 */}
        {state.phase === "enemyEscaped" && state.escapedEnemyId && (() => {
          const enemyServant = state.servantMap[state.escapedEnemyId!];
          const resolvedEnemy = resolve(enemyServant);
          const classColor = CLASS_COLORS[enemyServant.class];
          return (
            <div className="text-center">
              <p className="text-xs text-magic-blue uppercase tracking-wider mb-3">{t("trpg:enemyEscaped.title")}</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <div
                  className="w-14 h-14 rounded-full overflow-hidden border-2"
                  style={{ borderColor: classColor }}
                >
                  {resolvedEnemy.imageUrl ? (
                    <img src={resolvedEnemy.imageUrl} alt={resolvedEnemy.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: `${classColor}20` }}>⚔</div>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: classColor }}>{resolvedEnemy.name}</p>
                  <p className="text-xs text-gray-500">{enemyServant.class}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                {state.escapedViaSeal
                  ? t("trpg:enemyEscaped.sealMessage", { name: resolvedEnemy.name })
                  : t("trpg:enemyEscaped.message", { name: resolvedEnemy.name })}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAdvancePhase}
                className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("trpg:nightEnd.continue")}
              </motion.button>
            </div>
          );
        })()}

        {state.phase === "counterSealPrompt" && state.currentEncounter && (
          <div className="text-center">
            <p className="text-xs text-magic-red uppercase tracking-wider mb-3">{t("trpg:counterSeal.title")}</p>
            <p className="text-sm text-gray-400 mb-4">{t("trpg:counterSeal.message")}</p>

            <div className="flex flex-col gap-2">
              {(() => {
                const playerMaster = state.masters.find(m => m.isPlayer);
                const hasSeals = (playerMaster?.commandSeals ?? 0) > 0;
                return (
                  <>
                    {hasSeals && (
                      <div className="flex gap-2 justify-center">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onCounterSealDecision("boost")}
                          className="px-4 py-2 text-xs font-bold rounded-lg border border-magic-red/60 bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
                        >
                          {t("trpg:encounter.sealBoost")}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onCounterSealDecision("npFullPower")}
                          className="px-4 py-2 text-xs font-bold rounded-lg border border-gold/60 bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
                        >
                          {t("trpg:encounter.sealNP")}
                        </motion.button>
                      </div>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onCounterSealDecision(null)}
                      className="px-6 py-2 text-xs font-bold rounded-lg border border-gray-600 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors mx-auto"
                    >
                      {t("trpg:counterSeal.decline")}
                    </motion.button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {state.phase === "aiTurn" && (
          <div className="text-center py-6">
            <div className="animate-pulse text-magic-blue text-sm">
              {t("trpg:nightEnd.title")}...
            </div>
          </div>
        )}

        {state.phase === "manaSupplyPrompt" && (
          <div className="text-center">
            <p className="text-xs text-purple-400 uppercase tracking-wider mb-3">{t("trpg:manaSupply.title", "마력 공급")}</p>
            <p className="text-sm text-gray-400 mb-4">{t("trpg:manaSupply.prompt", "서번트에게 마력을 공급하시겠습니까?")}</p>
            <div className="flex gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onManaSupply}
                className="px-6 py-3 text-sm font-bold rounded-lg border-2 border-purple-500 bg-transparent text-purple-400 cursor-pointer hover:bg-purple-500/10 transition-colors"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("trpg:manaSupply.supply", "마력 공급")}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSkipManaSupply}
                className="px-6 py-3 text-sm font-bold rounded-lg border border-gray-600 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
              >
                {t("trpg:manaSupply.skip", "건너뛰기")}
              </motion.button>
            </div>
          </div>
        )}

        {state.phase === "manaSupplyResult" && state.lastManaSupplyOutcome && (() => {
          const outcome = state.lastManaSupplyOutcome!;
          const resultLabels: Record<string, Record<string, string>> = {
            ko: RESULT_LABELS_KO, en: RESULT_LABELS_EN, ja: RESULT_LABELS_JA,
          };
          const labels = resultLabels[i18n.language] ?? RESULT_LABELS_EN;
          const resultColor = RESULT_COLORS[outcome.result as ManaSupplyResult] ?? "#9ca3af";
          return (
            <div className="text-center">
              <p className="text-xs text-purple-400 uppercase tracking-wider mb-3">{t("trpg:manaSupply.title", "마력 공급")}</p>
              <p className="text-lg font-bold mb-2" style={{ color: resultColor }}>
                {labels[outcome.result] ?? outcome.result}
              </p>
              <p className="text-sm text-gray-300 mb-4 italic leading-relaxed">
                {outcome.narration}
              </p>
              {outcome.statDelta !== 0 && (
                <p className="text-xs mb-2" style={{ color: outcome.statDelta > 0 ? "#4ade80" : "#ef4444" }}>
                  {t("trpg:manaSupply.statChange", `전투력 ${outcome.statDelta > 0 ? "+" : ""}${outcome.statDelta}`)}
                </p>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAdvancePhase}
                className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("trpg:nightEnd.continue")}
              </motion.button>
            </div>
          );
        })()}

        {state.phase === "nightEnd" && (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">{t("trpg:nightEnd.title")}</p>
            {state.aiTurnResults.length > 0 && (
              <div className="mb-4 space-y-1 text-left">
                {state.aiTurnResults.map((entry, i) => (
                  <p key={i} className="text-xs text-magic-blue">
                    {t(entry.key, entry.params)}
                  </p>
                ))}
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAdvancePhase}
              className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {t("trpg:nightEnd.continue")}
            </motion.button>
          </div>
        )}

        {/* #5: 소원빌기 */}
        {state.phase === "grailWish" && (
          <div className="text-center">
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2), transparent 70%)" }}
            />
            <div className="text-4xl mb-3 relative z-10">🏆</div>
            <img src="/7999.png" alt="Holy Grail" style={{ display: "block", width: 80, height: 80, margin: "0 auto 0.75rem auto", objectFit: "contain" }} className="animate-pulse-glow relative z-10" />
            <h2 className="text-2xl font-bold mb-2 relative z-10" style={{ fontFamily: "var(--font-serif)", color: "#ffd700" }}>
              {t("common:simulation.grailObtained")}
            </h2>
            <p className="text-sm text-gray-400 mb-4 relative z-10">{t("common:simulation.congratsWish")}</p>
            <input
              type="text"
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              placeholder={t("common:simulation.wishPlaceholder")}
              className="relative z-10 w-full px-4 py-3 rounded-lg bg-white/5 border border-gold/30 text-sm text-white placeholder-gray-600 outline-none focus:border-gold/60 text-center mb-4"
              onKeyDown={(e) => { if (e.key === "Enter" && wish.trim()) onSetWish(wish.trim()); }}
              autoFocus
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => wish.trim() && onSetWish(wish.trim())}
              disabled={!wish.trim()}
              className="relative z-10 px-8 py-2 text-sm font-bold rounded-lg border border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              {t("common:simulation.makeWish")}
            </motion.button>
          </div>
        )}

        {state.phase === "gameOver" && (() => {
          const isVictory = state.winnerId === state.playerServantId;
          const playerServantData = state.servantMap[state.playerServantId];
          const resolvedPlayer = resolve(playerServantData);
          return (
            <div className="text-center">
              {isVictory && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0.05, 0.15, 0.05] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2), transparent 70%)" }}
                />
              )}
              <div className="text-4xl mb-3 relative z-10">
                {isVictory ? "🏆" : "⚰️"}
              </div>
              <h2
                className="text-2xl font-bold mb-2 relative z-10"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: isVictory ? "#ffd700" : "#ff4a4a",
                }}
              >
                {isVictory
                  ? t("trpg:gameOver.victory")
                  : t("trpg:gameOver.defeat")}
              </h2>
              <p className="text-sm text-gray-400 mb-2 relative z-10">
                {isVictory
                  ? t("trpg:gameOver.winnerMessage", {
                      name: resolvedPlayer.name,
                      days: state.day,
                    })
                  : t("trpg:gameOver.loserMessage")}
              </p>
              {state.wish && (
                <div className="mt-2 mb-4 p-3 rounded-lg bg-gold/5 border border-gold/20 relative z-10">
                  <p className="text-[10px] text-gray-500 mb-1">{t("common:simulation.wishInscribed")}</p>
                  <p className="text-gold text-sm font-bold">"{state.wish}"</p>
                </div>
              )}
              <div className="flex gap-3 justify-center mt-4 relative z-10">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-bold rounded-lg border border-gray-700 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  {t("trpg:gameOver.backToDashboard")}
                </motion.button>
              </div>
            </div>
          );
        })()}
      </motion.div>
    </div>
  );
}
