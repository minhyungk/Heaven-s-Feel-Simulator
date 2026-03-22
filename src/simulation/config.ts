// ─── Facade: engine/config.ts에서 re-export ───
// 기존 warEngine.ts의 import가 깨지지 않도록 유지

export {
  EXTRA_INVASION_CHANCE,
  EXTRA_INVASION_PLAYER_WEIGHT,
  AMBUSH_MAX_CHANCE,
  AMBUSH_WIN_BONUS,
  ANTI_MAGIC_MAX_BONUS,
  GUARD_DEFENSE_BONUS,
  DRAW_THRESHOLD,
  DRAW_CHANCES,
  FORCED_HUNT_DAY,
} from "../engine/config";
