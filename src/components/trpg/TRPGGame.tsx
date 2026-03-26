import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import type { Servant } from "../../data/types";
import { useTRPGGame } from "../../hooks/useTRPGGame";
import { getMovablePositions } from "../../engine/map";
import { getSkillPrefixes } from "../../i18n/skillKeys";
import i18n from "../../i18n";
import { useIsMobile } from "../../hooks/useMediaQuery";
import TRPGHeader from "./TRPGHeader";
import TRPGMap from "./TRPGMap";
import TRPGActionPanel from "./TRPGActionPanel";
import SurvivorsPanel from "./SurvivorsPanel";
import TRPGLogPanel from "./TRPGLogPanel";
import MobileTabLayout, { useTRPGTabs } from "./MobileTabLayout";
import ServantCard from "../ServantCard";
import ScreenEffects from "../simulation/ScreenEffects";
import type { ScreenEffectsHandle } from "../simulation/ScreenEffects";

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
    manaSupply,
    skipManaSupply,
  } = useTRPGGame(participants, playerServant.id);

  const screenEffectsRef = useRef<ScreenEffectsHandle>(null);
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

  // 전투 시작 시 화면 흔들기
  useEffect(() => {
    if (state.phase === "combatResult" && state.lastCombatResult) {
      screenEffectsRef.current?.shake();
    }
  }, [state.phase, state.lastCombatResult]);

  // 플레이어 사망 시 즉시 게임 오버이므로 자동 진행 불필요

  // #2: 이동 선택 시 도달 가능 타일 계산
  const prefixes = useMemo(() => getSkillPrefixes(i18n.language), []);
  const reachableTiles = useMemo(() => {
    if (state.phase !== "movementSelection" || !playerMaster) return undefined;
    if (state.day >= 7) return undefined; // 7일차+: 강제 이동, 타일 선택 불가
    return getMovablePositions(playerMaster.position, playerServant, prefixes);
  }, [state.phase, state.day, playerMaster, playerServant, prefixes]);

  const isMobile = useIsMobile();
  const tabDefs = useTRPGTabs();

  const mapAndAction = (
    <>
      <TRPGMap
        state={state}
        highlightTiles={reachableTiles}
        onTileClick={state.phase === "movementSelection" && reachableTiles
          ? (tileId) => { if (reachableTiles.includes(tileId)) selectMovement(tileId); }
          : undefined}
      />
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
        onManaSupply={manaSupply}
        onSkipManaSupply={skipManaSupply}
      />
      <SurvivorsPanel state={state} />
    </>
  );

  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex flex-col items-center px-2"
        style={{ paddingTop: "0.75rem", paddingBottom: "3.5rem" }}
      >
        <ScreenEffects ref={screenEffectsRef} />
        <TRPGHeader state={state} playerServant={playerServant} onClose={onClose} />
        <MobileTabLayout
          tabs={[
            { ...tabDefs.status, content: <div className="w-full flex flex-col items-center">{mapAndAction}</div> },
            { ...tabDefs.log, content: <TRPGLogPanel state={state} /> },
            { ...tabDefs.servant, content: (
              <div className="w-full max-w-2xl mx-auto px-2 pt-2">
                <ServantCard servant={playerServant} isPlayer />
              </div>
            )},
          ]}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center px-4 pb-12"
      style={{ paddingTop: "1.5rem" }}
    >
      <ScreenEffects ref={screenEffectsRef} />
      <TRPGHeader state={state} playerServant={playerServant} onClose={onClose} />
      {mapAndAction}
      <TRPGLogPanel state={state} />
    </motion.div>
  );
}
