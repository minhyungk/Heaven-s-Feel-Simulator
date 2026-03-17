import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGrailWar } from "./hooks/useGrailWar";
import StartScreen from "./components/StartScreen";
import GachaAnimation from "./components/GachaAnimation";
import WarDashboard from "./components/WarDashboard";
import WarSimulation from "./components/WarSimulation";
import CatalystModal from "./components/CatalystModal";
import RankingPage from "./components/RankingPage";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { ServantDataProvider } from "./contexts/ServantDataContext";
import type { Servant } from "./data/types";

export default function App() {
  const { phase, war, startWar, gachaComplete, skipToBoard, reroll, goHome, startSimulation, backToDashboard, goToRankings, backFromRankings } = useGrailWar();
  const [showCatalyst, setShowCatalyst] = useState(false);

  const handleCatalystSelect = (servant: Servant) => {
    setShowCatalyst(false);
    startWar(servant);
  };

  return (
    <ServantDataProvider>
      <AnimatePresence mode="wait">
        {phase === "start" && (
          <StartScreen
            key="start"
            onStart={() => startWar()}
            onCatalyst={() => setShowCatalyst(true)}
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
      </AnimatePresence>

      <LanguageSwitcher />
    </ServantDataProvider>
  );
}
