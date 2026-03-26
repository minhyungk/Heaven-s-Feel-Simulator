import type { LogEntry } from "./types";

function makeLog(day: number, phase: string, key: string, params: Record<string, string>, servantRefs?: Record<string, number>): LogEntry {
  return { day, phase, key, params, servantRefs };
}

// ─── 조우 ───
export function logEncounter(day: number, className: string, tileName: string, enemyClassName: string): LogEntry {
  return makeLog(day, "encounter", "trpg:log.encounter", {
    class: className, tile: tileName, enemyClass: enemyClassName,
  });
}

// ─── 기습 ───
export function logAmbush(day: number, name: string, servantId: number): LogEntry {
  return makeLog(day, "combat", "trpg:log.ambush", { name }, { name: servantId });
}

// ─── 대마력 ───
export function logAntiMagic(day: number, name: string, servantId: number): LogEntry {
  return makeLog(day, "combat", "trpg:log.antiMagic", { name }, { name: servantId });
}

// ─── 특공 ───
export function logSpecialAttack(day: number, attackerName: string, npName: string, targetName: string, attackerId: number, targetId: number): LogEntry {
  return makeLog(day, "combat", "trpg:log.specialAttack", {
    attacker: attackerName, np: npName, target: targetName,
  }, { attacker: attackerId, target: targetId });
}

// ─── 영주 사용 ───
export function logCommandSeal(day: number, sealType: string, className?: string): LogEntry {
  if (className) {
    return makeLog(day, "commandSeal", "trpg:log.commandSealWithClass", { type: sealType, class: className });
  }
  return makeLog(day, "commandSeal", "trpg:log.commandSeal", { type: sealType });
}

// ─── 소강 ───
export function logQuietNight(day: number): LogEntry {
  return makeLog(day, "quiet", "trpg:log.quietNight", { day: String(day) });
}

// ─── 전투 결과 ───
export function logCombatResult(day: number, winnerName: string, loserName: string, isDraw: boolean, winnerId?: number, loserId?: number): LogEntry {
  if (isDraw) {
    return makeLog(day, "combat", "trpg:log.draw", { a: winnerName, b: loserName });
  }
  return makeLog(day, "combat", "trpg:log.victory", {
    winner: winnerName, loser: loserName,
  }, winnerId !== undefined && loserId !== undefined ? { winner: winnerId, loser: loserId } : undefined);
}

// ─── 도주 ───
export function logEscape(day: number, name: string, success: boolean, servantId: number): LogEntry {
  return makeLog(day, "escape", success ? "trpg:log.escapeSuccess" : "trpg:log.escapeFail", { name }, { name: servantId });
}

// ─── 영주 도주 ───
export function logSealEscape(day: number, name: string, servantId: number): LogEntry {
  return makeLog(day, "escape", "trpg:log.sealEscape", { name }, { name: servantId });
}

// ─── 보구 전개 ───
export function logNPDeploy(day: number, name: string, npName: string, servantId: number): LogEntry {
  return makeLog(day, "combat", "trpg:log.npDeploy", { name, np: npName }, { name: servantId });
}

// ─── 도주 페널티 회복 ───
export function logEscapeRecovery(day: number, name: string, servantId: number): LogEntry {
  return makeLog(day, "recovery", "trpg:log.escapeRecovery", { name }, { name: servantId });
}

// ─── 도주 불가 (7일차+) ───
export function logNoEscape(day: number): LogEntry {
  return makeLog(day, "escape", "trpg:log.noEscape", {});
}

// ─── 은신 발각 ───
export function logDetection(day: number, hiderName: string, seekerName: string, hiderId: number, seekerId: number): LogEntry {
  return makeLog(day, "detection", "trpg:log.detected", {
    hider: hiderName, seeker: seekerName,
  }, { hider: hiderId, seeker: seekerId });
}

// ─── 광화 명령 무시 ───
export function logMadDisobey(day: number, name: string, originalIntent: string, overriddenIntent: string, servantId: number, className?: string): LogEntry {
  if (className) {
    return makeLog(day, "madEnhancement", "trpg:log.madDisobeyClass", {
      class: className, originalIntent, overriddenIntent,
    }, { name: servantId });
  }
  return makeLog(day, "madEnhancement", "trpg:log.madDisobey", {
    name, originalIntent, overriddenIntent,
  }, { name: servantId });
}

// ─── 은신 발각 기습 ───
export function logAmbushDetection(day: number, enemyName: string, playerId: number): LogEntry {
  return makeLog(day, "ambushDetection", "trpg:log.ambushDetection", { name: enemyName }, { player: playerId });
}

// ─── 플레이어 은신 중 발각 ───
export function logPlayerDetected(day: number, seekerName: string, seekerId: number): LogEntry {
  return makeLog(day, "detection", "trpg:log.playerDetected", { seeker: seekerName }, { seeker: seekerId });
}

// ─── AI 교전 소식 ───
export function logAICombatNews(day: number, combatantAClass: string, combatantBClass: string, tileName: string, distance: number): LogEntry {
  if (distance === 0) {
    return makeLog(day, "aiCombat", "trpg:log.aiCombatSameTile", {
      classA: combatantAClass, classB: combatantBClass, tile: tileName,
    });
  } else if (distance === 1) {
    return makeLog(day, "aiCombat", "trpg:log.aiCombatAdjacent", {
      classA: combatantAClass, classB: combatantBClass,
    });
  } else {
    return makeLog(day, "aiCombat", "trpg:log.aiCombatDistant", {});
  }
}

// ─── 탈락 ───
export function logElimination(day: number, name: string, servantId: number): LogEntry {
  return makeLog(day, "elimination", "trpg:log.elimination", { name }, { name: servantId });
}

// ─── 단독행동 잔존 ───
export function logIndependentAction(day: number, name: string, remainingDays: number, servantId: number): LogEntry {
  return makeLog(day, "independentAction", "trpg:log.independentAction", {
    name, days: String(remainingDays),
  }, { name: servantId });
}

// ─── 호감도 변화 ───
export function logAffectionChange(day: number, name: string, delta: number, servantId: number): LogEntry {
  const sign = delta > 0 ? "+" : "";
  return makeLog(day, "affection", "trpg:log.affectionChange", {
    name, delta: `${sign}${delta}`,
  }, { name: servantId });
}

// ─── 마력공급 ───
export function logManaSupply(day: number, name: string, result: string, narration: string, servantId: number): LogEntry {
  return makeLog(day, "manaSupply", "trpg:log.manaSupply", {
    name, result, narration,
  }, { name: servantId });
}

// ─── 명령 거부 ───
export function logCommandRefusal(day: number, name: string, orderedIntent: string, actualIntent: string, servantId: number): LogEntry {
  return makeLog(day, "affection", "trpg:log.commandRefusal", {
    name, ordered: orderedIntent, actual: actualIntent,
  }, { name: servantId });
}

// ─── 동맹 결성 ───
export function logAllianceFormed(day: number, nameA: string, nameB: string, idA: number, idB: number): LogEntry {
  return makeLog(day, "alliance", "trpg:log.allianceFormed", {
    nameA, nameB,
  }, { a: idA, b: idB });
}

// ─── 배신 ───
export function logBetrayal(day: number, betrayerName: string, victimName: string, betrayerId: number, victimId: number): LogEntry {
  return makeLog(day, "alliance", "trpg:log.betrayal", {
    betrayer: betrayerName, victim: victimName,
  }, { betrayer: betrayerId, victim: victimId });
}

// ─── 게임 종료 ───
export function logGameOver(day: number, winnerName: string, winnerId: number): LogEntry {
  return makeLog(day, "gameOver", "trpg:log.gameOver", { winner: winnerName }, { winner: winnerId });
}
