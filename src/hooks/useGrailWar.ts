import { useState, useCallback } from "react";
import type { Servant, ServantClass } from "../data/types";
import { BASIC_CLASSES } from "../data/types";
import servants from "../data/servants";
import { EXTRA_INVASION_CHANCE, EXTRA_INVASION_PLAYER_WEIGHT } from "../simulation/config";

const EXTRA_CLASSES: ServantClass[] = ["Ruler", "Avenger", "MoonCancer", "AlterEgo", "Foreigner"];

export interface GrailWarResult {
  participants: Servant[];
  playerServant: Servant;
  hasExtraInvasion: boolean;
  extraServant: Servant | null; // the extra class servant that invaded
}

function getServantsByClass(cls: ServantClass): Servant[] {
  return servants.filter((s) => s.class === cls);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function tryExtraInvasion(participants: Servant[], playerIdx: number): { invaded: boolean; extraServant: Servant | null; newParticipants: Servant[] } {
  if (Math.random() > EXTRA_INVASION_CHANCE) return { invaded: false, extraServant: null, newParticipants: participants };

  // Find available extra class servants
  const extraPool = EXTRA_CLASSES.flatMap((cls) => getServantsByClass(cls));
  if (extraPool.length === 0) return { invaded: false, extraServant: null, newParticipants: participants };

  const extraServant = pickRandom(extraPool);

  // Pick which slot to replace: player has ~2/7 weight, others 1/7 each
  // Total weight = 2 + 6 = 8, player chance = 2/8 = 25%
  const weights = participants.map((_, i) => (i === playerIdx ? EXTRA_INVASION_PLAYER_WEIGHT : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let replaceIdx = 0;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { replaceIdx = i; break; }
  }

  const newParticipants = [...participants];
  newParticipants[replaceIdx] = extraServant;

  return { invaded: true, extraServant, newParticipants };
}

function summonGrailWar(catalyst?: Servant): GrailWarResult {
  if (catalyst) {
    const participants: Servant[] = [catalyst];
    const remainingClasses = BASIC_CLASSES.filter((cls) => cls !== catalyst.class);
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
    // Extra invasion for non-player slots only when using catalyst
    const { invaded, extraServant, newParticipants } = tryExtraInvasion(participants, 0);
    // If player slot was replaced, keep catalyst as player
    const playerServant = invaded && newParticipants[0].id !== catalyst.id
      ? newParticipants[0] // extra replaced player slot
      : catalyst;

    return { participants: newParticipants, playerServant, hasExtraInvasion: invaded, extraServant };
  }

  const participants: Servant[] = [];
  for (const cls of BASIC_CLASSES) {
    const pool = getServantsByClass(cls);
    if (pool.length > 0) {
      participants.push(pickRandom(pool));
    }
  }
  const playerIdx = Math.floor(Math.random() * participants.length);

  const { invaded, extraServant, newParticipants } = tryExtraInvasion(participants, playerIdx);
  const playerServant = newParticipants[playerIdx];

  return { participants: newParticipants, playerServant, hasExtraInvasion: invaded, extraServant };
}

export type GamePhase = "start" | "gacha" | "dashboard" | "simulation";

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

  const startSimulation = useCallback(() => {
    setPhase("simulation");
  }, []);

  const backToDashboard = useCallback(() => {
    setPhase("dashboard");
  }, []);

  const goHome = useCallback(() => {
    setWar(null);
    setPhase("start");
  }, []);

  return { phase, war, startWar, gachaComplete, skipToBoard, reroll, goHome, startSimulation, backToDashboard };
}
