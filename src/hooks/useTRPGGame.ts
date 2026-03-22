import { useReducer, useCallback, useMemo } from "react";
import type { Servant } from "../data/types";
import type { TRPGAction, TRPGGameState } from "../engine/types";
import { createInitialState, trpgReducer } from "../engine/trpgLoop";
import { getSkillPrefixes } from "../i18n/skillKeys";
import i18n from "../i18n";

function createReducerWithPrefixes() {
  return (state: TRPGGameState, action: TRPGAction): TRPGGameState => {
    const lang = i18n.language;
    const prefixes = getSkillPrefixes(lang) ;
    return trpgReducer(state, action, prefixes);
  };
}

export function useTRPGGame(participants: Servant[], playerServantId: number) {
  const initialState = useMemo(
    () => createInitialState(participants, playerServantId),
    [participants, playerServantId],
  );

  const reducer = useMemo(() => createReducerWithPrefixes(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const selectIntent = useCallback((intent: "hunt" | "guard" | "hide") => {
    dispatch({ type: "selectIntent", intent });
  }, []);

  const selectMovement = useCallback((target: string) => {
    dispatch({ type: "selectMovement", target: target as TRPGGameState["masters"][0]["position"] });
  }, []);

  const encounterDecision = useCallback((fight: boolean) => {
    dispatch({ type: "encounterDecision", fight });
  }, []);

  const useCommandSeal = useCallback((sealType: string) => {
    dispatch({ type: "useCommandSeal", sealType: sealType as "boost" | "escape" | "npFullPower" | "madControl" });
  }, []);

  const counterSealDecision = useCallback((useSeal: string | null) => {
    dispatch({ type: "counterSealDecision", useSeal: useSeal as "boost" | "npFullPower" | null });
  }, []);

  const defeatEscapeDecision = useCallback((useSeal: boolean) => {
    dispatch({ type: "defeatEscapeDecision", useSeal });
  }, []);

  const setWish = useCallback((wish: string) => {
    dispatch({ type: "setWish", wish });
  }, []);

  const advancePhase = useCallback(() => {
    dispatch({ type: "advancePhase" });
  }, []);

  const resolveAI = useCallback(() => {
    dispatch({ type: "resolveAI" });
  }, []);

  return {
    state,
    selectIntent,
    selectMovement,
    encounterDecision,
    useCommandSeal,
    counterSealDecision,
    defeatEscapeDecision,
    setWish,
    advancePhase,
    resolveAI,
  };
}
