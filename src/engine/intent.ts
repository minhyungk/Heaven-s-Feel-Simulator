import type { Servant, ServantClass } from "../data/types";
import type { Intent } from "./types";
import { FORCED_HUNT_DAY } from "./config";

export const INTENT_WEIGHTS: Record<ServantClass, [number, number, number]> = {
  Saber:      [40, 45, 15],
  Archer:     [35, 40, 25],
  Lancer:     [50, 35, 15],
  Rider:      [45, 30, 25],
  Caster:     [20, 35, 45],
  Assassin:   [25, 20, 55],
  Berserker:  [70, 25, 5],
  Ruler:      [30, 50, 20],
  Avenger:    [65, 25, 10],
  MoonCancer: [35, 30, 35],
  AlterEgo:   [45, 35, 20],
  Foreigner:  [40, 20, 40],
  Pretender:  [30, 25, 45],
  Shielder:   [20, 60, 20],
};

export function rollIntent(servant: Servant, day: number): Intent {
  if (day >= FORCED_HUNT_DAY) return "hunt";
  const [h, g] = INTENT_WEIGHTS[servant.class];
  const roll = Math.random() * 100;
  if (roll < h) return "hunt";
  if (roll < h + g) return "guard";
  return "hide";
}
