import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { Servant } from "../../data/types";
import { useTRPGGame } from "../../hooks/useTRPGGame";
import { getMovablePositions } from "../../engine/map";
import { getSkillPrefixes } from "../../i18n/skillKeys";
import i18n from "../../i18n";
import TRPGHeader from "./TRPGHeader";
import TRPGMap from "./TRPGMap";
import TRPGActionPanel from "./TRPGActionPanel";
import SurvivorsPanel from "./SurvivorsPanel";
import TRPGLogPanel from "./TRPGLogPanel";

interface Props {
  participants: Servant[];
  playerServant: Servant;
  onClose: () => void;
}

export default function TRPGGame({ participants, playerServant, onClose }: Props) {
  const {
    state,
    selectIntent,
    selectMovement,
    encounterDecision,
    useCommandSeal,
    counterSealDecision,
    defeatEscapeDecision,
    setWish,
    advancePhase,
    resolveAI,
  } = useTRPGGame(participants, playerServant.id);

  const playerMaster = state.masters.find(m => m.isPlayer);
  const playerAlive = playerMaster?.isAlive ?? false;

  // AI 턴 자동 진행
  useEffect(() => {
    if (state.phase === "aiTurn") {
      const timer = setTimeout(() => resolveAI(), playerAlive ? 800 : 200);
      return () => clearTimeout(timer);
    }
  }, [state.phase, resolveAI, playerAlive]);

  // 7일차+: 이동 자동 선택 (후유키 대교)
  useEffect(() => {
    if (state.phase === "movementSelection" && state.day >= 7) {
      const timer = setTimeout(() => selectMovement("bridge"), 500);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.day, selectMovement]);

  // 플레이어 사망 시 즉시 게임 오버이므로 자동 진행 불필요

  // #2: 이동 선택 시 도달 가능 타일 계산
  const prefixes = useMemo(() => getSkillPrefixes(i18n.language), []);
  const reachableTiles = useMemo(() => {
    if (state.phase !== "movementSelection" || !playerMaster) return undefined;
    if (state.day >= 7) return undefined; // 7일차+: 강제 이동, 타일 선택 불가
    return getMovablePositions(playerMaster.position, playerServant, prefixes);
  }, [state.phase, state.day, playerMaster, playerServant, prefixes]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center px-4 pb-12"
      style={{ paddingTop: "1.5rem" }}
    >
      {/* Header */}
      <TRPGHeader state={state} playerServant={playerServant} onClose={onClose} />

      {/* Map with clickable tiles during movement */}
      <TRPGMap
        state={state}
        highlightTiles={reachableTiles}
        onTileClick={state.phase === "movementSelection" && reachableTiles
          ? (tileId) => { if (reachableTiles.includes(tileId)) selectMovement(tileId); }
          : undefined}
      />

      {/* Action Panel */}
      <TRPGActionPanel
        state={state}
        playerServant={playerServant}
        onSelectIntent={selectIntent}
        onEncounterDecision={encounterDecision}
        onUseCommandSeal={useCommandSeal}
        onCounterSealDecision={counterSealDecision}
        onDefeatEscapeDecision={defeatEscapeDecision}
        onSetWish={setWish}
        onAdvancePhase={advancePhase}
        onClose={onClose}
      />

      {/* Survivors */}
      <SurvivorsPanel state={state} />

      {/* Log */}
      <TRPGLogPanel state={state} />
    </motion.div>
  );
}
