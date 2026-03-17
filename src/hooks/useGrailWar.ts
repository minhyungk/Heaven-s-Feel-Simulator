import { useState, useCallback } from "react";
import type { Servant, ServantClass } from "../data/types";
import { BASIC_CLASSES } from "../data/types";
import { useServantData } from "../contexts/ServantDataContext";
import { EXTRA_INVASION_CHANCE, EXTRA_INVASION_PLAYER_WEIGHT } from "../simulation/config";

const EXTRA_CLASSES: ServantClass[] = ["Ruler", "Avenger", "MoonCancer", "AlterEgo", "Foreigner"];

export interface GrailWarResult {
  participants: Servant[];
  playerServant: Servant;
  hasExtraInvasion: boolean;
  extraServant: Servant | null;
  summonType: "random" | "catalyst";
  catalyst: Servant | null;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function tryExtraInvasion(servantPool: Servant[], participants: Servant[], playerIdx: number): { invaded: boolean; extraServant: Servant | null; newParticipants: Servant[] } {
  if (Math.random() > EXTRA_INVASION_CHANCE) return { invaded: false, extraServant: null, newParticipants: participants };

  const extraPool = EXTRA_CLASSES.flatMap((cls) => servantPool.filter((s) => s.class === cls));
  if (extraPool.length === 0) return { invaded: false, extraServant: null, newParticipants: participants };

  const extraServant = pickRandom(extraPool);

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

function summonGrailWar(servantPool: Servant[], catalyst?: Servant): GrailWarResult {
  const getByClass = (cls: ServantClass) => servantPool.filter((s) => s.class === cls);

  if (catalyst) {
    const participants: Servant[] = [catalyst];
    const remainingClasses = BASIC_CLASSES.filter((cls) => cls !== catalyst.class);
    if (!BASIC_CLASSES.includes(catalyst.class)) {
      const removeIdx = Math.floor(Math.random() * remainingClasses.length);
      remainingClasses.splice(removeIdx, 1);
    }
    for (const cls of remainingClasses) {
      const pool = getByClass(cls).filter((s) => s.id !== catalyst.id);
      if (pool.length > 0) {
        participants.push(pickRandom(pool));
      }
    }
    const { invaded, extraServant, newParticipants } = tryExtraInvasion(servantPool, participants, 0);
    const playerServant = invaded && newParticipants[0].id !== catalyst.id
      ? newParticipants[0]
      : catalyst;

    return { participants: newParticipants, playerServant, hasExtraInvasion: invaded, extraServant, summonType: "catalyst", catalyst };
  }

  const participants: Servant[] = [];
  for (const cls of BASIC_CLASSES) {
    const pool = getByClass(cls);
    if (pool.length > 0) {
      participants.push(pickRandom(pool));
    }
  }
  const playerIdx = Math.floor(Math.random() * participants.length);

  const { invaded, extraServant, newParticipants } = tryExtraInvasion(servantPool, participants, playerIdx);
  const playerServant = newParticipants[playerIdx];

  return { participants: newParticipants, playerServant, hasExtraInvasion: invaded, extraServant, summonType: "random", catalyst: null };
}

export type GamePhase = "start" | "gacha" | "dashboard" | "simulation" | "rankings";

export function useGrailWar() {
  const { servants } = useServantData();
  const [phase, setPhase] = useState<GamePhase>("start");
  const [war, setWar] = useState<GrailWarResult | null>(null);

  const startWar = useCallback((catalyst?: Servant) => {
    const result = summonGrailWar(servants, catalyst);
    setWar(result);
    setPhase("gacha");
  }, [servants]);

  const skipToBoard = useCallback(() => {
    setPhase("dashboard");
  }, []);

  const gachaComplete = useCallback(() => {
    setPhase("dashboard");
  }, []);

  const reroll = useCallback(() => {
    const result = summonGrailWar(servants);
    setWar(result);
    setPhase("gacha");
  }, [servants]);

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

  const goToRankings = useCallback(() => {
    setPhase("rankings");
  }, []);

  const backFromRankings = useCallback(() => {
    setPhase("start");
  }, []);

  return { phase, war, startWar, gachaComplete, skipToBoard, reroll, goHome, startSimulation, backToDashboard, goToRankings, backFromRankings };
}
