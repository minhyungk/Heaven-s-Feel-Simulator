import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGrailWar } from "./hooks/useGrailWar";
import StartScreen from "./components/StartScreen";
import GachaAnimation from "./components/GachaAnimation";
import WarDashboard from "./components/WarDashboard";
import WarSimulation from "./components/WarSimulation";
import CatalystModal from "./components/CatalystModal";
import type { Servant } from "./data/types";

export default function App() {
  const { phase, war, startWar, gachaComplete, skipToBoard, reroll, goHome, startSimulation, backToDashboard } = useGrailWar();
  const [showCatalyst, setShowCatalyst] = useState(false);

  const handleCatalystSelect = (servant: Servant) => {
    setShowCatalyst(false);
    startWar(servant);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {phase === "start" && (
          <StartScreen
            key="start"
            onStart={() => startWar()}
            onCatalyst={() => setShowCatalyst(true)}
          />
        )}
        {phase === "dashboard" && war && (
          <WarDashboard
            key="dashboard"
            war={war}
            onReroll={reroll}
            onHome={goHome}
            onStartSimulation={startSimulation}
          />
        )}
        {phase === "simulation" && war && (
          <WarSimulation
            key="simulation"
            participants={war.participants}
            playerServant={war.playerServant}
            onClose={backToDashboard}
          />
        )}
      </AnimatePresence>

      {phase === "gacha" && war && (
        <GachaAnimation
          servant={war.playerServant}
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
    </>
  );
}
