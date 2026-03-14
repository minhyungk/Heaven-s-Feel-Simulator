import { useState, useCallback } from "react";
import type { Servant, ServantClass } from "../data/types";
import { BASIC_CLASSES } from "../data/types";
import servants from "../data/servants";

export interface GrailWarResult {
  participants: Servant[];
  playerServant: Servant;
}

function getServantsByClass(cls: ServantClass): Servant[] {
  return servants.filter((s) => s.class === cls);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function summonGrailWar(catalyst?: Servant): GrailWarResult {
  if (catalyst) {
    const participants: Servant[] = [catalyst];
    const remainingClasses = BASIC_CLASSES.filter((cls) => cls !== catalyst.class);
    // If catalyst is an extra class, remove a random basic class to keep 7 total
    if (!BASIC_CLASSES.includes(catalyst.class)) {
      const removeIdx = Math.floor(Math.random() * remainingClasses.length);
      remainingClasses.splice(removeIdx, 1);
    }
    for (const cls of remainingClasses) {
      const pool = getServantsByClass(cls).filter((s) => s.id !== catalyst.id);
      if (pool.length > 0) {
        participants.push(pickRandom(pool));
      }
    }
    return { participants, playerServant: catalyst };
  }

  const participants: Servant[] = [];
  for (const cls of BASIC_CLASSES) {
    const pool = getServantsByClass(cls);
    if (pool.length > 0) {
      participants.push(pickRandom(pool));
    }
  }
  const playerServant = pickRandom(participants);
  return { participants, playerServant };
}

export type GamePhase = "start" | "gacha" | "dashboard";

export function useGrailWar() {
  const [phase, setPhase] = useState<GamePhase>("start");
  const [war, setWar] = useState<GrailWarResult | null>(null);

  const startWar = useCallback((catalyst?: Servant) => {
    const result = summonGrailWar(catalyst);
    setWar(result);
    setPhase("gacha");
  }, []);

  const skipToBoard = useCallback(() => {
    setPhase("dashboard");
  }, []);

  const gachaComplete = useCallback(() => {
    setPhase("dashboard");
  }, []);

  const reroll = useCallback(() => {
    const result = summonGrailWar();
    setWar(result);
    setPhase("gacha");
  }, []);

  const goHome = useCallback(() => {
    setWar(null);
    setPhase("start");
  }, []);

  return { phase, war, startWar, gachaComplete, skipToBoard, reroll, goHome };
}
