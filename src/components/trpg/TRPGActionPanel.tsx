import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Servant } from "../../data/types";
import { CLASS_COLORS } from "../../data/types";
import type { TRPGGameState, Intent } from "../../engine/types";
import { calcEscapeChance } from "../../engine/escape";
import { findClassSkillRank } from "../../engine/combat";
import { getSkillPrefixes } from "../../i18n/skillKeys";
import { useServantResolver } from "../../contexts/ServantDataContext";
import i18n from "../../i18n";
import { TIER_LABELS_KO, TIER_LABELS_EN, TIER_LABELS_JA } from "../../engine/affection";
import type { AffectionTier } from "../../engine/affection";
import IntentSelection from "./IntentSelection";
import EncounterDecision from "./EncounterDecision";
import CombatResult from "./CombatResult";
import { RESULT_COLORS, RESULT_LABELS_KO, RESULT_LABELS_EN, RESULT_LABELS_JA } from "../../engine/manaSupply";
import type { ManaSupplyResult } from "../../engine/manaSupply";
import TypewriterLog from "../simulation/TypewriterLog";
import {
  generateBattleNarrative,
  generateDefeatCrisisNarrative,
  generateEscapeNarrative,
  generateEncounterNarrative,
  generateCounterSealNarrative,
} from "../../engine/narrativeGenerator";
import type { NarrativeLine, NarrativeEffect } from "../../engine/narrativeFormatter";
import { pickDialogue } from "../../data/servantDialogues";
import { getVocab } from "../../data/classVocabulary";
import { CLASH_TEMPLATES } from "../../data/narrativeTemplates";
import { fixParticles } from "../../utils/josa";

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
  onBetrayalDecision?: (useSeal: boolean) => void;
}

const TIER_LABELS: Record<string, Record<AffectionTier, string>> = {
  ko: TIER_LABELS_KO, en: TIER_LABELS_EN, ja: TIER_LABELS_JA,
};

function getTierLabel(tier: AffectionTier): string {
  const labels = TIER_LABELS[i18n.language] ?? TIER_LABELS_EN;
  return labels[tier];
}

/** LogEntry phase → narrative effect 매핑 */
function phaseToEffect(phase: string): NarrativeEffect {
  if (phase === "elimination") return "elimination";
  if (phase === "aiCombat") return "normal";
  if (phase === "alliance") return "stealth_fade";
  return "normal";
}

/** 호감도 알림 → NarrativeLine 변환 */
function affectionToLine(notif: { message: string; delta: number; tier: AffectionTier }): NarrativeLine {
  const tierLabel = getTierLabel(notif.tier);
  const suffix = notif.delta === 0
    ? "(호감도 변화 없음)"
    : `(${tierLabel} ${notif.delta > 0 ? `+${notif.delta}` : notif.delta})`;
  return {
    text: `${notif.message} ${suffix}`,
    effect: notif.delta > 0 ? "normal" : notif.delta < 0 ? "critical" : "draw",
    speed: "normal",
    delay: 300,
  };
}

export default function TRPGActionPanel({
  state, playerServant,
  onSelectIntent, onEncounterDecision,
  onUseCommandSeal, onCounterSealDecision, onDefeatEscapeDecision,
  onSetWish, onAdvancePhase, onClose,
  onManaSupply, onSkipManaSupply, onBetrayalDecision,
}: Props) {
  const { t } = useTranslation(["trpg", "simulation"]);
  const resolve = useServantResolver();
  const [wish, setWish] = useState("");

  // 패배 위기 → 타이프라이터 완료 후 버튼 표시
  const [crisisDone, setCrisisDone] = useState(false);
  // 도주 시도 중 연속 서사 라인
  const [escapeContinuationLines, setEscapeContinuationLines] = useState<NarrativeLine[]>([]);
  const [escapeAttempting, setEscapeAttempting] = useState(false);

  // 조우 서사 완료 여부 (encounterDecision)
  const [encounterNarrativeDone, setEncounterNarrativeDone] = useState(false);

  // 밤 종료 타이프라이터 완료
  const [nightDone, setNightDone] = useState(false);

  // 마력공급 서사 타이프라이터 완료
  const [manaSupplyDone, setManaSupplyDone] = useState(false);

  // 영주 대항 서사 완료
  const [counterSealDone, setCounterSealDone] = useState(false);

  // 도주 결과 서사 완료
  const [escapeDone, setEscapeDone] = useState(false);

  // 패배 서사 완료
  const [defeatedDone, setDefeatedDone] = useState(false);

  // 후유키 대교 소환 서사 완료
  const [bridgeNarrativeDone, setBridgeNarrativeDone] = useState(false);

  // 적 도주 서사 완료
  const [enemyEscapeDone, setEnemyEscapeDone] = useState(false);

  // 소환 대사 표시 완료
  const [summonDialogueDone, setSummonDialogueDone] = useState(false);

  // phase 변경 시 임시 상태 초기화
  useEffect(() => {
    setCrisisDone(false);
    setEscapeContinuationLines([]);
    setEscapeAttempting(false);
    setEncounterNarrativeDone(false);
    setNightDone(false);
    setManaSupplyDone(false);
    setCounterSealDone(false);
    setEscapeDone(false);
    setDefeatedDone(false);
    setBridgeNarrativeDone(false);
    setEnemyEscapeDone(false);
    setSummonDialogueDone(false);
  }, [state.phase]);

  // ── 패배 위기 서사 라인 (전투 묘사 + 패배 위기) ──
  const defeatCrisisLines = useMemo(() => {
    if (state.phase !== "defeatEscapePrompt" || !state.currentEncounter) return [];
    const enemy = state.servantMap[state.currentEncounter.enemyId];
    if (!enemy) return [];
    const lines: NarrativeLine[] = [];
    // 전투 결과가 있으면 먼저 전투 묘사 출력 (Bug 1: 영주 사용 시 전투 서사 누락)
    if (state.lastCombatResult) {
      lines.push(...generateBattleNarrative({
        servantA: playerServant,
        servantB: enemy,
        combatResult: state.lastCombatResult,
        day: state.day,
        intentMatchup: state.currentEncounter.intentMatchup ?? "hunt_hunt",
        skipResult: true,
      }));
    }
    lines.push(...generateDefeatCrisisNarrative(playerServant, enemy));
    return lines;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // ── 조우 서사 라인 ──
  const encounterNarrativeLines = useMemo(() => {
    if (state.phase !== "encounterDecision" || !state.currentEncounter) return [];
    const enemy = state.servantMap[state.currentEncounter.enemyId];
    if (!enemy) return [];
    const matchup = state.currentEncounter.intentMatchup ?? "hunt_hunt";
    const tileId = state.playerMoveTarget ?? undefined;
    const tileNames = { ryuudou: "류도사", miyama: "미야마 주택가", school: "학교", forest: "숲", bridge: "후유키 대교", downtown: "시가지", port: "항구", church: "교회", park: "강변공원" };
    const tileName = tileId ? (tileNames as Record<string, string>)[tileId] ?? tileId : "";

    // 진지작성 보유 서번트 찾기 (해당 타일에 있는 아군)
    const prefixes = getSkillPrefixes(i18n.language);
    let territoryServant: typeof playerServant | null = null;
    if (tileId) {
      const tc = findClassSkillRank(playerServant, prefixes.territoryCreation);
      if (tc) {
        territoryServant = playerServant;
      }
    }

    return generateEncounterNarrative(playerServant, enemy, matchup, tileName, {
      tileId: tileId as import("../../engine/types").TileId | undefined,
      playerIntent: state.playerIntent ?? "hunt",
      territoryServant,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // ── 밤 종료 서사 (aiTurnResults → NarrativeLine[]) ──
  const nightNarrativeLines = useMemo(() => {
    if (state.phase !== "nightEnd") return [];
    const header: NarrativeLine = {
      text: t("trpg:nightEnd.title"),
      effect: "normal",
      speed: "normal",
      delay: 300,
    };
    const resultLines: NarrativeLine[] = state.aiTurnResults.map(entry => ({
      text: t(entry.key, entry.params),
      effect: phaseToEffect(entry.phase),
      speed: "normal" as const,
      delay: 300,
    }));
    return [header, ...resultLines];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.aiTurnResults]);

  // ── 행동 선택 후 호감도 변화 라인 (movementSelection) ──
  const movementAffectionLines = useMemo(() => {
    if (state.phase !== "movementSelection") return [];
    const lines: NarrativeLine[] = [];
    // 명령 거부 메시지
    if (state.lastRefusalMessage) {
      lines.push({
        text: state.lastRefusalMessage,
        effect: "critical" as NarrativeEffect,
        speed: "normal" as const,
        delay: 400,
      });
    }
    // 호감도 변화 메시지
    if (state.lastAffectionNotification) {
      lines.push(affectionToLine(state.lastAffectionNotification));
    }
    return lines;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // ── 마력공급 서사 라인 ──
  const manaSupplyNarrativeLines = useMemo(() => {
    if (state.phase !== "manaSupplyResult" || !state.lastManaSupplyOutcome) return [];
    const outcome = state.lastManaSupplyOutcome;
    const lines: NarrativeLine[] = [{
      text: outcome.narration,
      effect: "normal" as NarrativeEffect,
      speed: "normal" as const,
      delay: 400,
    }];
    // 호감도 변화 라인을 서사에 포함
    if (state.lastAffectionNotification) {
      lines.push(affectionToLine(state.lastAffectionNotification));
    }
    return lines;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // ── 도주 결과 서사 라인 ──
  const escapeResultLines = useMemo(() => {
    if (state.phase !== "playerEscaped") return [];
    const enemyId = state.escapedEnemyId;
    const enemy = enemyId ? state.servantMap[enemyId] : null;
    if (!enemy) return [];

    const lines: NarrativeLine[] = [];

    // 도주 시도 라인
    lines.push(...generateEscapeNarrative(playerServant, enemy, "try"));

    // 도주 성공 라인 (확률 기반 또는 영주)
    if (state.escapedViaSeal) {
      lines.push(...generateEscapeNarrative(playerServant, enemy, "success_seal"));
    } else {
      const prefixes = getSkillPrefixes(i18n.language);
      const escapeChance = Math.round(calcEscapeChance(playerServant, enemy, prefixes) * 100);
      lines.push(...generateEscapeNarrative(playerServant, enemy, "success", escapeChance));
    }

    // 호감도 변화 라인
    if (state.lastAffectionNotification) {
      lines.push(affectionToLine(state.lastAffectionNotification));
    }

    return lines;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // ── 영주 대항 전투 서사 라인 ──
  const counterSealNarrativeLines = useMemo(() => {
    if (state.phase !== "counterSealPrompt" || !state.currentEncounter) return [];
    const enemy = state.servantMap[state.currentEncounter.enemyId];
    if (!enemy) return [];
    return generateCounterSealNarrative(playerServant, enemy);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // ── 적 도주 서사 라인 (enemyEscaped 페이즈) ──
  const enemyEscapeNarrativeLines = useMemo(() => {
    if (state.phase !== "enemyEscaped") return [];
    const enemyId = state.currentEncounter?.enemyId ?? state.escapedEnemyId;
    if (!enemyId) return [];
    const enemy = state.servantMap[enemyId];
    if (!enemy) return [];
    const lines: NarrativeLine[] = [];
    // 조우 서사
    const pm = state.masters.find(m => m.isPlayer);
    lines.push(...generateEncounterNarrative(
      playerServant, enemy,
      state.currentEncounter?.intentMatchup ?? "hunt_hunt",
      pm?.position ?? "bridge",
    ));
    // 배틀 개시 대사
    const bsA = pickDialogue(playerServant.id, "battleStart");
    if (bsA) lines.push({ text: `${playerServant.name}: "${bsA}"`, effect: "servant_dialogue" as NarrativeEffect, speed: "normal" as const, delay: 400 });
    const bsB = pickDialogue(enemy.id, "battleStart");
    if (bsB) lines.push({ text: `${enemy.name}: "${bsB}"`, effect: "servant_dialogue" as NarrativeEffect, speed: "normal" as const, delay: 400 });
    // 랜덤 전투 묘사 (1~3줄)
    const vocabA = getVocab(playerServant.class);
    const vocabB = getVocab(enemy.class);
    const clashCount = 1 + Math.floor(Math.random() * 3);
    const clashPools = ["even", "advantage", "disadvantage"] as const;
    for (let i = 0; i < clashCount; i++) {
      const gap = clashPools[Math.floor(Math.random() * clashPools.length)];
      const pool = CLASH_TEMPLATES.default[gap] ?? CLASH_TEMPLATES.default.even;
      if (pool.length > 0) {
        const template = pool[Math.floor(Math.random() * pool.length)];
        const vars = {
          A: playerServant.name, B: enemy.name,
          "무기": vocabA.weapon, "동사": vocabA.verb,
          "무기B": vocabB.weapon,
          "보구명": playerServant.noblePhantasm?.name ?? "",
          "보구명B": enemy.noblePhantasm?.name ?? "",
        };
        let text = template;
        for (const [key, value] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        }
        lines.push({ text: fixParticles(text), effect: "normal" as NarrativeEffect, speed: "normal" as const, delay: 350 });
      }
    }
    // 적 도주 메시지
    const resolvedEnemy = resolve(enemy);
    if (state.escapedViaSeal) {
      lines.push({
        text: `${resolvedEnemy.name}의 마스터가 영주를 사용했다! 강제 전이 — ${resolvedEnemy.name}이(가) 전장에서 이탈한다!`,
        effect: "np_glow" as NarrativeEffect,
        speed: "normal" as const,
        delay: 600,
      });
    } else {
      lines.push({
        text: `${resolvedEnemy.name}이(가) 전장에서 이탈했다.`,
        effect: "stealth_fade" as NarrativeEffect,
        speed: "normal" as const,
        delay: 400,
      });
    }
    return lines;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // ── 패배 서사 라인 (playerDefeated 페이즈) ──
  const playerDefeatedLines = useMemo(() => {
    if (state.phase !== "playerDefeated") return [];
    const lines: NarrativeLine[] = [];

    const enemyId = state.escapedEnemyId;
    const enemy = enemyId ? state.servantMap[enemyId] : null;

    // 배신에 의한 패배 (적이 없는 경우)
    if (!enemy) {
      const sName = playerServant.name;
      const betrayalMsgs = [
        fixParticles(`${sName}에게 배신당하고 말았다. 피로 물들여진 당신을 두고 ${sName}은(는) 어딘가로 사라졌다.`),
        fixParticles(`${sName}의 칼날이 마스터를 관통한다. 계약은 파기되었다. ${sName}은(는) 한 마디의 말도 없이 등을 돌렸다.`),
        fixParticles(`${sName}은(는) 마스터의 영주마저 뜯어낸 채 전장을 떠났다. 차가운 밤바람만이 쓰러진 당신 위를 지나간다.`),
      ];
      const msg = betrayalMsgs[Math.floor(Math.random() * betrayalMsgs.length)];
      lines.push({
        text: msg,
        effect: "critical" as NarrativeEffect,
        speed: "slow" as const,
        delay: 800,
      });
      return lines;
    }

    // 전투 패배에 의한 패배
    // 도주 시도 → 실패 서사
    lines.push(...generateEscapeNarrative(playerServant, enemy, "try"));
    lines.push(...generateEscapeNarrative(playerServant, enemy, "fail"));
    // 전투 불능 대사
    const defeatLine = pickDialogue(playerServant.id, "defeat");
    if (defeatLine) {
      lines.push({
        text: `${playerServant.name}: "${defeatLine}"`,
        effect: "servant_dialogue" as NarrativeEffect,
        speed: "slow" as const,
        delay: 600,
      });
    }
    // 영핵 파괴 / 탈락 서사
    lines.push({
      text: `${playerServant.name}의 영핵이 파괴되었다. 퇴거가 진행된다...`,
      effect: "critical" as NarrativeEffect,
      speed: "slow" as const,
      delay: 600,
    });
    lines.push({
      text: "패배...",
      effect: "elimination" as NarrativeEffect,
      speed: "slow" as const,
      delay: 800,
    });
    return lines;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // 도주 시도 핸들러 — 타이프라이터 연속 서사
  const handleEscapeAttempt = (useSeal: boolean) => {
    if (escapeAttempting) return;
    const enemy = state.currentEncounter ? state.servantMap[state.currentEncounter.enemyId] : null;
    if (!enemy) { onDefeatEscapeDecision(useSeal); return; }

    setEscapeAttempting(true);
    const tryLines = generateEscapeNarrative(playerServant, enemy, "try");
    setEscapeContinuationLines(tryLines);

    // 잠시 후 실제 처리 (타이프라이터가 try 라인 표시하는 동안)
    setTimeout(() => {
      onDefeatEscapeDecision(useSeal);
    }, 1200);
  };

  // ── 소환 대사 (게임 시작 시 1회) ──
  const hasSummonDialogue = state.phase === "intentSelection" && state.day === 1 && state.actionCount === 0 && !state.summonDialogueShown;
  const summonDialogueLines = useMemo(() => {
    if (!hasSummonDialogue) return [];
    const summonText = pickDialogue(playerServant.id, "summon");
    if (!summonText) return [];
    return [{
      text: `${playerServant.name}: "${summonText}"`,
      effect: "servant_dialogue" as NarrativeEffect,
      speed: "slow" as const,
      delay: 400,
    }];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSummonDialogue]);

  const playerMaster = state.masters.find(m => m.isPlayer);

  return (
    <div className="w-full max-w-2xl mb-4">
      <motion.div
        key={state.phase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5 relative overflow-hidden"
        style={{
          background: "#0d0d24",
          border: "1px solid rgba(255,255,255,0.08)",
          minHeight: "320px",
        }}
      >
        {/* ── intentSelection ── */}
        {state.phase === "intentSelection" && (
          <div>
            {/* 소환 대사 (게임 시작 시 1회, 완료 후에도 유지) */}
            {summonDialogueLines.length > 0 && (
              <div className="mb-3">
                <TypewriterLog lines={summonDialogueLines} onComplete={() => setSummonDialogueDone(true)} />
              </div>
            )}
            {/* 소환 대사 완료 후 또는 대사 없으면 바로 행동 선택 표시 */}
            {(summonDialogueDone || summonDialogueLines.length === 0) && (
              <>
                <p className="text-[10px] text-gray-600 text-center mb-1">
                  {t("trpg:action.indicator", { current: state.actionCount + 1, max: 2 })}
                </p>
                <IntentSelection onSelect={onSelectIntent} />
              </>
            )}
          </div>
        )}

        {/* ── movementSelection ── */}
        {state.phase === "movementSelection" && (
          <div>
            {/* 호감도 변화 타이프라이터 */}
            {movementAffectionLines.length > 0 && (
              <div className="mb-3">
                <TypewriterLog lines={movementAffectionLines} />
              </div>
            )}
            <p className="text-sm text-yellow-400 text-center mb-3 uppercase tracking-wider">{t("trpg:tips.title")}</p>
            {state.day >= 7 ? (
              <div className="text-center">
                <p className="text-xs text-magic-red font-bold mb-2">{t("trpg:tips.noEscapeDay7")}</p>
              </div>
            ) : null}
            <div className="mt-3 space-y-1.5">
              {(["npDeploy", "specialAttack", "escape", "guard", "ambush", "antiMagic", "territory"] as const).map(key => (
                <p key={key} className="text-[12px] text-gray-400 leading-relaxed">
                  • {t(`trpg:tips.${key}`)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── forcedBridgeNotice ── */}
        {state.phase === "forcedBridgeNotice" && (
          <div className="text-center">
            <p className="text-xs text-magic-red uppercase tracking-wider mb-3">{t("trpg:forcedBridge.title")}</p>
            <div className="mb-4">
              <TypewriterLog
                lines={[
                  { text: t("trpg:forcedBridge.message"), effect: "normal" as NarrativeEffect, speed: "normal" as const, delay: 400 },
                  { text: t("trpg:forcedBridge.gather"), effect: "critical" as NarrativeEffect, speed: "slow" as const, delay: 600 },
                ]}
                onComplete={() => setBridgeNarrativeDone(true)}
              />
            </div>
            {bridgeNarrativeDone && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={onAdvancePhase}
                  className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-magic-red bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {t("trpg:nightEnd.continue")}
                </motion.button>
              </motion.div>
            )}
          </div>
        )}

        {/* ── encounterDecision — 조우 서사 유지 + 완료 후 프로필 + 결정 UI ── */}
        {state.phase === "encounterDecision" && state.currentEncounter && (
          <div>
            {encounterNarrativeLines.length > 0 && (
              <div className="mb-3">
                <TypewriterLog
                  lines={encounterNarrativeLines}
                  onComplete={() => setEncounterNarrativeDone(true)}
                />
              </div>
            )}
            {(encounterNarrativeDone || encounterNarrativeLines.length === 0) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <EncounterDecision
                  state={state}
                  playerServant={playerServant}
                  onDecision={onEncounterDecision}
                  onUseSeal={onUseCommandSeal}
                />
              </motion.div>
            )}
          </div>
        )}

        {/* ── combatResult ── */}
        {state.phase === "combatResult" && state.lastCombatResult && (
          <CombatResult
            result={state.lastCombatResult}
            playerServantId={state.playerServantId}
            state={state}
            onContinue={onAdvancePhase}
          />
        )}

        {/* ── defeatEscapePrompt — 서사 유지 + 완료 후 타이틀 + 버튼 ── */}
        {state.phase === "defeatEscapePrompt" && state.currentEncounter && (
          <div className="text-center">
            {/* 패배 위기 서사 (항상 유지) */}
            {defeatCrisisLines.length > 0 && (
              <div className="mb-3">
                <TypewriterLog lines={defeatCrisisLines} onComplete={() => setCrisisDone(true)} />
              </div>
            )}

            {/* 도주 시도 중 연속 서사 */}
            {escapeContinuationLines.length > 0 && (
              <div className="mb-3">
                <TypewriterLog lines={escapeContinuationLines} />
              </div>
            )}

            {/* 타이틀 + 버튼: 서사 완료 후, 시도 중이 아닐 때만 표시 */}
            {(crisisDone || defeatCrisisLines.length === 0) && !escapeAttempting && (
              <>
                {state.currentEncounter?.canEscape === false ? (
                  /* 7일차+ 도주 불가 → 패배 확정 버튼만 표시 */
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={onAdvancePhase}
                    className="mt-4 px-8 py-3 text-sm font-bold rounded-lg border border-magic-red/60 bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
                  >
                    {t("trpg:gameOver.fallen")}
                  </motion.button>
                ) : (
                  <>
                    <p className="text-xs text-magic-red uppercase tracking-wider mb-3">{t("trpg:defeatEscape.title")}</p>
                    <p className="text-sm text-gray-400 my-4">{t("trpg:defeatEscape.message")}</p>
                    {(() => {
                      const prefixes = getSkillPrefixes(i18n.language);
                      const enemyServant = state.servantMap[state.currentEncounter!.enemyId];
                      const escapeChance = Math.round(calcEscapeChance(playerServant, enemyServant, prefixes) * 100);
                      const hasSeals = (playerMaster?.commandSeals ?? 0) > 0;
                      return (
                        <div className="flex flex-col items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => handleEscapeAttempt(false)}
                            className="w-fit px-5 py-2.5 text-sm font-bold rounded-lg border border-gray-600 bg-transparent text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
                          >
                            {t("trpg:defeatEscape.tryEscape", { chance: escapeChance })}
                          </motion.button>
                          {hasSeals && (
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => handleEscapeAttempt(true)}
                              className="w-fit px-5 py-2.5 text-sm font-bold rounded-lg border border-magic-blue/60 bg-transparent text-magic-blue cursor-pointer hover:bg-magic-blue/10 transition-colors"
                            >
                              {t("trpg:defeatEscape.sealEscape")}
                            </motion.button>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── playerEscaped — 도주 서사 + 호감도 ── */}
        {state.phase === "playerEscaped" && (
          <div className="text-center">
            <p className="text-xs text-magic-blue uppercase tracking-wider mb-3">{t("trpg:playerEscaped.title")}</p>

            {escapeResultLines.length > 0 ? (
              <div className="mb-3">
                <TypewriterLog
                  lines={escapeResultLines}
                  onComplete={() => setEscapeDone(true)}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">
                {state.escapedViaSeal
                  ? t("trpg:playerEscaped.sealMessage")
                  : t("trpg:playerEscaped.message")}
              </p>
            )}

            {(escapeDone || escapeResultLines.length === 0) && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onAdvancePhase}
                className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("trpg:nightEnd.continue")}
              </motion.button>
            )}
          </div>
        )}

        {/* ── playerDefeated — 패배 연속 서사 ── */}
        {state.phase === "playerDefeated" && (
          <div className="text-center">
            {playerDefeatedLines.length > 0 ? (
              <div className="mb-3">
                <TypewriterLog
                  lines={playerDefeatedLines}
                  onComplete={() => setDefeatedDone(true)}
                />
              </div>
            ) : (
              <p className="text-sm text-magic-red mb-4">{t("trpg:gameOver.title")}</p>
            )}

            {(defeatedDone || playerDefeatedLines.length === 0) && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onAdvancePhase}
                className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-magic-red bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("trpg:gameOver.fallen")}
              </motion.button>
            )}
          </div>
        )}

        {/* ── enemyEscaped ── */}
        {state.phase === "enemyEscaped" && (() => {
          const enemyId = state.currentEncounter?.enemyId ?? state.escapedEnemyId;
          if (!enemyId) return null;
          const enemyServant = state.servantMap[enemyId];
          if (!enemyServant) return null;
          const resolvedEnemy = resolve(enemyServant);
          const classColor = CLASS_COLORS[enemyServant.class];
          return (
            <div className="text-center">
              <p className="text-xs text-magic-blue uppercase tracking-wider mb-3">{t("trpg:enemyEscaped.title")}</p>

              {/* 전투 서사 타이프라이터 */}
              {enemyEscapeNarrativeLines.length > 0 && (
                <div className="mb-3">
                  <TypewriterLog
                    lines={enemyEscapeNarrativeLines}
                    onComplete={() => setEnemyEscapeDone(true)}
                  />
                </div>
              )}

              {/* 서사 완료 후 프로필 + 버튼 */}
              {(enemyEscapeDone || enemyEscapeNarrativeLines.length === 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2" style={{ borderColor: classColor }}>
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
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={onAdvancePhase}
                    className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {t("trpg:nightEnd.continue")}
                  </motion.button>
                </motion.div>
              )}
            </div>
          );
        })()}

        {/* ── counterSealPrompt — 전투 서사 후 영주 대항 선택 ── */}
        {state.phase === "counterSealPrompt" && state.currentEncounter && (
          <div className="text-center">
            <p className="text-xs text-magic-red uppercase tracking-wider mb-3">{t("trpg:counterSeal.title")}</p>

            {/* 전투 서사 타이프라이터 */}
            {counterSealNarrativeLines.length > 0 && (
              <div className="mb-3">
                <TypewriterLog
                  lines={counterSealNarrativeLines}
                  onComplete={() => setCounterSealDone(true)}
                />
              </div>
            )}

            {/* 서사 완료 후 선택지 */}
            {(counterSealDone || counterSealNarrativeLines.length === 0) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-sm text-gray-400 mb-4">{t("trpg:counterSeal.message")}</p>
                <div className="flex flex-col items-center gap-2">
                  {(() => {
                    const hasSeals = (playerMaster?.commandSeals ?? 0) > 0;
                    return (
                      <>
                        {hasSeals && (
                          <div className="flex gap-2 justify-center">
                            <motion.button
                              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              onClick={() => onCounterSealDecision("boost")}
                              className="px-4 py-2 text-[10px] font-bold rounded-lg border border-magic-red/60 bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors whitespace-pre-line leading-tight"
                            >
                              {t("trpg:encounter.sealBoost").replace(" (", "\n(")}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              onClick={() => onCounterSealDecision("npFullPower")}
                              className="px-4 py-2 text-[10px] font-bold rounded-lg border border-gold/60 bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors whitespace-pre-line leading-tight"
                            >
                              {t("trpg:encounter.sealNP").replace(" (", "\n(")}
                            </motion.button>
                          </div>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => onCounterSealDecision(null)}
                          className="w-fit px-4 py-2 text-xs font-bold rounded-lg border border-gray-600 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                          {t("trpg:counterSeal.decline")}
                        </motion.button>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── aiTurn ── */}
        {state.phase === "aiTurn" && (
          <div className="text-center py-6">
            <div className="animate-pulse text-magic-blue text-sm">
              {t("trpg:nightEnd.title")}...
            </div>
          </div>
        )}

        {/* ── manaSupplyPrompt ── */}
        {state.phase === "manaSupplyPrompt" && (
          <div className="text-center">
            <p className="text-xs text-purple-400 uppercase tracking-wider mb-3">{t("trpg:manaSupply.title")}</p>
            <p className="text-sm text-gray-400 mb-4">
              {state.manaSupplyWeaknessReason
                ? t("trpg:manaSupply.promptWeakness", { name: resolve(playerServant).name })
                : t("trpg:manaSupply.promptWithName", { name: resolve(playerServant).name })}
            </p>
            <div className="flex gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onManaSupply}
                className="px-6 py-3 text-sm font-bold rounded-lg border-2 border-purple-500 bg-transparent text-purple-400 cursor-pointer hover:bg-purple-500/10 transition-colors"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("trpg:manaSupply.supply")}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onSkipManaSupply}
                className="px-6 py-3 text-sm font-bold rounded-lg border border-gray-600 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
              >
                {t("trpg:manaSupply.skip")}
              </motion.button>
            </div>
          </div>
        )}

        {/* ── manaSupplyResult — 서번트 프로필 + 타이프라이터 ── */}
        {state.phase === "manaSupplyResult" && state.lastManaSupplyOutcome && (() => {
          const outcome = state.lastManaSupplyOutcome!;
          const resultLabels: Record<string, Record<string, string>> = {
            ko: RESULT_LABELS_KO, en: RESULT_LABELS_EN, ja: RESULT_LABELS_JA,
          };
          const labels = resultLabels[i18n.language] ?? RESULT_LABELS_EN;
          const resultColor = RESULT_COLORS[outcome.result as ManaSupplyResult] ?? "#9ca3af";
          const resolvedPlayer = resolve(playerServant);
          const classColor = CLASS_COLORS[playerServant.class];
          return (
            <div className="text-center">
              <p className="text-xs text-purple-400 uppercase tracking-wider mb-3">{t("trpg:manaSupply.resultTitle")}</p>

              {/* 서번트 프로필 */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2" style={{ borderColor: classColor }}>
                  {resolvedPlayer.imageUrl ? (
                    <img src={resolvedPlayer.imageUrl} alt={resolvedPlayer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: `${classColor}20` }}>⚔</div>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: classColor }}>{resolvedPlayer.name}</p>
                  <p className="text-xs text-gray-500">{playerServant.class}</p>
                </div>
              </div>

              {/* 결과 라벨 */}
              <p className="text-lg font-bold mb-3" style={{ color: resultColor }}>
                {labels[outcome.result] ?? outcome.result}
              </p>

              {/* 서사 타이프라이터 */}
              {manaSupplyNarrativeLines.length > 0 && (
                <div className="mb-3">
                  <TypewriterLog
                    lines={manaSupplyNarrativeLines}
                    onComplete={() => setManaSupplyDone(true)}
                  />
                </div>
              )}

              {/* 타이프라이터 완료 후 수치 + 버튼 */}
              {(manaSupplyDone || manaSupplyNarrativeLines.length === 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {outcome.statDelta !== 0 && (
                    <p className="text-xs mb-3" style={{ color: outcome.statDelta > 0 ? "#4ade80" : "#ef4444" }}>
                      {t("trpg:manaSupply.statChange", { delta: `${outcome.statDelta > 0 ? "+" : ""}${outcome.statDelta}` })}
                    </p>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={onAdvancePhase}
                    className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {t("trpg:manaSupply.continue")}
                  </motion.button>
                </motion.div>
              )}
            </div>
          );
        })()}

        {/* ── nightEnd — 서사 유지 + 완료 후 버튼 ── */}
        {state.phase === "nightEnd" && (
          <div className="text-center">
            <TypewriterLog
              lines={nightNarrativeLines}
              onComplete={() => setNightDone(true)}
            />
            {nightDone && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onAdvancePhase}
                className="mt-4 px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("trpg:nightEnd.continue")}
              </motion.button>
            )}
          </div>
        )}

        {/* ── betrayalPrompt — 서번트 배신 ── */}
        {state.phase === "betrayalPrompt" && (() => {
          const pMaster = state.masters.find(m => m.isPlayer);
          const hasSeals = (pMaster?.commandSeals ?? 0) > 0;
          const betrayalLines: NarrativeLine[] = [
            {
              text: fixParticles(`${playerServant.name}의 살기가 마스터를 향하고 있다.`),
              effect: "critical" as NarrativeEffect,
              speed: "slow" as const,
              delay: 600,
            },
            {
              text: fixParticles(`${playerServant.name}은(는) 더 이상 마스터의 명령에 따를 생각이 없는 것 같다.`),
              effect: "critical" as NarrativeEffect,
              speed: "slow" as const,
              delay: 800,
            },
          ];
          const defeatDialogue = pickDialogue(playerServant.id, "defeat");
          if (defeatDialogue) {
            betrayalLines.push({
              text: `${playerServant.name}: "${defeatDialogue}"`,
              effect: "servant_dialogue" as NarrativeEffect,
              speed: "slow" as const,
              delay: 500,
            });
          }

          return (
            <div className="text-center">
              <TypewriterLog
                lines={betrayalLines}
                onComplete={() => setCrisisDone(true)}
              />
              {crisisDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-3"
                >
                  <p className="text-sm text-magic-red font-bold mb-2">
                    서번트가 배신을 시도하고 있다!
                  </p>
                  {hasSeals && (
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => onBetrayalDecision?.(true)}
                      className="w-full px-6 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      영주로 서번트를 제어한다 (영주 1획)
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => onBetrayalDecision?.(false)}
                    className="w-full px-6 py-3 text-sm font-bold rounded-lg border-2 border-magic-red/50 bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {hasSeals ? "그대로 당한다..." : "영주가 없다..."}
                  </motion.button>
                </motion.div>
              )}
            </div>
          );
        })()}

        {/* ── grailWish ── */}
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
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => wish.trim() && onSetWish(wish.trim())}
              disabled={!wish.trim()}
              className="relative z-10 px-8 py-2 text-sm font-bold rounded-lg border border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              {t("common:simulation.makeWish")}
            </motion.button>
          </div>
        )}

        {/* ── gameOver ── */}
        {state.phase === "gameOver" && (() => {
          const isVictory = state.winnerId === state.playerServantId;
          const resolvedPlayer = resolve(playerServant);
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
              {isVictory && (
                <div className="flex justify-center mb-3 relative z-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ width: 96, height: 96 }}
                  >
                    <div
                      className="w-full h-full rounded-full overflow-hidden border-2"
                      style={{ borderColor: "#ffd700", boxShadow: "0 0 20px rgba(255,215,0,0.4)" }}
                    >
                      <img
                        src={resolvedPlayer.imageUrl}
                        alt={resolvedPlayer.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  </motion.div>
                </div>
              )}
              <div className="text-4xl mb-3 relative z-10">{isVictory ? "🏆" : "⚰️"}</div>
              <h2
                className="text-2xl font-bold mb-2 relative z-10"
                style={{ fontFamily: "var(--font-serif)", color: isVictory ? "#ffd700" : "#ff4a4a" }}
              >
                {isVictory ? t("trpg:gameOver.victory") : t("trpg:gameOver.defeat")}
              </h2>
              <p className="text-sm text-gray-400 mb-2 relative z-10">
                {isVictory
                  ? t("trpg:gameOver.winnerMessage", { name: resolvedPlayer.name, days: state.day })
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
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
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
