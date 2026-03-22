import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGrailWar } from "./hooks/useGrailWar";
import StartScreen from "./components/StartScreen";
import GachaAnimation from "./components/GachaAnimation";
import WarDashboard from "./components/WarDashboard";
import WarSimulation from "./components/WarSimulation";
import CatalystModal from "./components/CatalystModal";
import DesignatedSummonModal from "./components/DesignatedSummonModal";
import RankingPage from "./components/RankingPage";
import TRPGGame from "./components/trpg/TRPGGame";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { ServantDataProvider } from "./contexts/ServantDataContext";
import type { Servant } from "./data/types";

export default function App() {
  const { phase, war, startWar, designatedSummon, startWarForTRPG, gachaComplete, skipToBoard, reroll, goHome, startSimulation, startTRPG, backToDashboard, goToRankings, backFromRankings } = useGrailWar();
  const [showCatalyst, setShowCatalyst] = useState(false);
  const [showDesignated, setShowDesignated] = useState(false);

  const handleCatalystSelect = (servant: Servant) => {
    setShowCatalyst(false);
    startWar(servant);
  };

  const handleDesignatedConfirm = (playerServant: Servant, enemies: Servant[]) => {
    setShowDesignated(false);
    designatedSummon(playerServant, enemies);
  };

  return (
    <ServantDataProvider>
      <AnimatePresence mode="wait">
        {phase === "start" && (
          <StartScreen
            key="start"
            onStart={() => startWar()}
            onCatalyst={() => setShowCatalyst(true)}
            onDesignated={() => setShowDesignated(true)}
            onStartTRPG={startWarForTRPG}
            onRankings={goToRankings}
          />
        )}
        {phase === "rankings" && (
          <RankingPage key="rankings" onBack={backFromRankings} />
        )}
        {phase === "dashboard" && war && (
          <WarDashboard
            key="dashboard"
            war={war}
            onReroll={reroll}
            onCatalyst={() => setShowCatalyst(true)}
            onHome={goHome}
            onRankings={goToRankings}
            onStartSimulation={startSimulation}
            onStartTRPG={startTRPG}
          />
        )}
        {phase === "simulation" && war && (
          <WarSimulation
            key="simulation"
            participants={war.participants}
            playerServant={war.playerServant}
            summonType={war.summonType}
            catalyst={war.catalyst}
            onClose={backToDashboard}
            onRankings={goToRankings}
          />
        )}
        {phase === "trpg" && war && (
          <TRPGGame
            key="trpg"
            participants={war.participants}
            playerServant={war.playerServant}
            onClose={backToDashboard}
          />
        )}
      </AnimatePresence>

      {phase === "gacha" && war && (
        <GachaAnimation
          servant={war.playerServant}
          isExtraInvasion={war.hasExtraInvasion}
          onComplete={gachaComplete}
          onSkip={skipToBoard}
        />
      )}

      <AnimatePresence>
        {showCatalyst && (
          <CatalystModal
            onSelect={handleCatalystSelect}
            onClose={() => setShowCatalyst(false)}
          />
        )}
        {showDesignated && (
          <DesignatedSummonModal
            onConfirm={handleDesignatedConfirm}
            onClose={() => setShowDesignated(false)}
          />
        )}
      </AnimatePresence>

      <LanguageSwitcher />
    </ServantDataProvider>
  );
}
