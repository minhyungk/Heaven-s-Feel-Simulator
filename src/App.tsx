import { AnimatePresence } from "framer-motion";
import { useGrailWar } from "./hooks/useGrailWar";
import StartScreen from "./components/StartScreen";
import GachaAnimation from "./components/GachaAnimation";
import WarDashboard from "./components/WarDashboard";

export default function App() {
  const { phase, war, startWar, gachaComplete, skipToBoard, reroll, goHome } = useGrailWar();

  return (
    <>
      <AnimatePresence mode="wait">
        {phase === "start" && <StartScreen key="start" onStart={startWar} />}
        {phase === "dashboard" && war && (
          <WarDashboard key="dashboard" war={war} onReroll={reroll} onHome={goHome} />
        )}
      </AnimatePresence>

      {phase === "gacha" && war && (
        <GachaAnimation
          servant={war.playerServant}
          onComplete={gachaComplete}
          onSkip={skipToBoard}
        />
      )}
    </>
  );
}
