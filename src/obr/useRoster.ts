import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlborCharacter,
  AlborState,
  DICE_LOG_MAX,
  DiceRollLogEntry,
  EMPTY_STATE,
  makeDiceRollLogEntry,
  normalizeCharacter,
} from "../types";
import { WEB_STATE_KEY } from "../web/sheetLink";

function asList<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function parseState(raw: Partial<AlborState> | undefined): AlborState {
  return {
    characters: asList(raw?.characters).map((c) => normalizeCharacter(c)),
    dicePlusEnabled: raw?.dicePlusEnabled ?? false,
    diceLog: asList(raw?.diceLog),
  };
}

function readLocalState(): AlborState {
  try {
    const raw = localStorage.getItem(WEB_STATE_KEY);
    if (!raw) return EMPTY_STATE;
    return parseState(JSON.parse(raw) as Partial<AlborState>);
  } catch {
    return EMPTY_STATE;
  }
}

function writeLocalState(state: AlborState): void {
  try {
    const json = JSON.stringify(state);
    if (localStorage.getItem(WEB_STATE_KEY) === json) return;
    localStorage.setItem(WEB_STATE_KEY, json);
  } catch {
    // quota / private mode
  }
}

function isFullEntry(
  input: Omit<DiceRollLogEntry, "id" | "timestamp"> | DiceRollLogEntry,
): input is DiceRollLogEntry {
  return "id" in input && typeof input.id === "string" && "timestamp" in input;
}

export function useRoster() {
  const [state, setState] = useState<AlborState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const stateRef = useRef<AlborState>(EMPTY_STATE);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const initial = readLocalState();
    stateRef.current = initial;
    setState(initial);
    setReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== WEB_STATE_KEY || !event.newValue) return;
      try {
        const parsed = parseState(JSON.parse(event.newValue) as Partial<AlborState>);
        stateRef.current = parsed;
        setState(parsed);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: AlborState) => {
    stateRef.current = next;
    setState(next);
    writeLocalState(next);
  }, []);

  const addCharacter = useCallback(
    (character: AlborCharacter) =>
      commit({
        ...stateRef.current,
        characters: [...stateRef.current.characters, character],
      }),
    [commit],
  );

  const updateCharacter = useCallback(
    (id: string, patch: Partial<AlborCharacter> | AlborCharacter) =>
      commit({
        ...stateRef.current,
        characters: stateRef.current.characters.map((c) =>
          c.id === id ? { ...c, ...patch } : c,
        ),
      }),
    [commit],
  );

  const removeCharacter = useCallback(
    (id: string) =>
      commit({
        ...stateRef.current,
        characters: stateRef.current.characters.filter((c) => c.id !== id),
      }),
    [commit],
  );

  const setDicePlusEnabled = useCallback(
    (dicePlusEnabled: boolean) => commit({ ...stateRef.current, dicePlusEnabled }),
    [commit],
  );

  const addDiceRoll = useCallback(
    (input: Omit<DiceRollLogEntry, "id" | "timestamp"> | DiceRollLogEntry) => {
      const entry = isFullEntry(input) ? input : makeDiceRollLogEntry(input);
      if (stateRef.current.diceLog.some((item) => item.id === entry.id)) return;
      const diceLog = [entry, ...stateRef.current.diceLog].slice(0, DICE_LOG_MAX);
      return commit({ ...stateRef.current, diceLog });
    },
    [commit],
  );

  const clearDiceLog = useCallback(
    () => commit({ ...stateRef.current, diceLog: [] }),
    [commit],
  );

  const replaceState = useCallback((next: AlborState) => commit(parseState(next)), [commit]);

  const replaceTable = useCallback(
    (diceLog: DiceRollLogEntry[], dicePlusEnabled: boolean) =>
      commit({
        ...stateRef.current,
        diceLog: diceLog.slice(0, DICE_LOG_MAX),
        dicePlusEnabled,
      }),
    [commit],
  );

  return {
    state,
    ready,
    addCharacter,
    updateCharacter,
    removeCharacter,
    setDicePlusEnabled,
    addDiceRoll,
    clearDiceLog,
    replaceState,
    replaceTable,
  };
}

export type Roster = ReturnType<typeof useRoster>;
