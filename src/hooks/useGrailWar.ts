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

function summonGrailWar(): GrailWarResult {
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

  const startWar = useCallback(() => {
    const result = summonGrailWar();
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
