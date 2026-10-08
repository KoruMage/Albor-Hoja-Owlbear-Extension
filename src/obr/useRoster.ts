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
import { appStorage, onAppStorageChange } from "../web/appStorage";
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

function writeLocalState(state: AlborState): string | null {
  try {
    const json = JSON.stringify(state);
    if (appStorage().getItem(WEB_STATE_KEY) !== json) appStorage().setItem(WEB_STATE_KEY, json);
    return json;
  } catch {
    return null;
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
  const rawRef = useRef<string | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const applyRaw = (raw: string | null) => {
      if (raw === rawRef.current) return;
      rawRef.current = raw;
      let next = EMPTY_STATE;
      if (raw) {
        try {
          next = parseState(JSON.parse(raw) as Partial<AlborState>);
        } catch {
          next = EMPTY_STATE;
        }
      }
      stateRef.current = next;
      setState(next);
    };
    const reload = () => {
      try {
        applyRaw(appStorage().getItem(WEB_STATE_KEY));
      } catch {
        applyRaw(null);
      }
    };
    reload();
    setReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== WEB_STATE_KEY) return;
      applyRaw(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    const unsubscribe = onAppStorageChange(reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      unsubscribe();
    };
  }, []);

  const commit = useCallback((next: AlborState) => {
    stateRef.current = next;
    setState(next);
    const written = writeLocalState(next);
    if (written !== null) rawRef.current = written;
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

  const upsertCharacter = useCallback(
    (character: AlborCharacter) => {
      const exists = stateRef.current.characters.some((item) => item.id === character.id);
      return commit({
        ...stateRef.current,
        characters: exists
          ? stateRef.current.characters.map((item) => (item.id === character.id ? character : item))
          : [...stateRef.current.characters, character],
      });
    },
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
    upsertCharacter,
    removeCharacter,
    setDicePlusEnabled,
    addDiceRoll,
    clearDiceLog,
    replaceState,
    replaceTable,
  };
}

export type Roster = ReturnType<typeof useRoster>;
