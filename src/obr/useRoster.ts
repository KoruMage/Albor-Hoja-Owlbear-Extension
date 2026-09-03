import { useCallback, useEffect, useRef, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import {
  AlborCharacter,
  AlborState,
  copySheetOnto,
  DICE_LOG_MAX,
  DiceRollLogEntry,
  EMPTY_STATE,
  METADATA_KEY,
  makeDiceRollLogEntry,
  normalizeCharacter,
} from "../types";
import {
  WEB_STATE_KEY,
  PlayerSyncMap,
  isLocalSyncEnabled,
  readPlayerSyncMap,
  setLocalSyncEnabled,
  writePlayerSyncMap,
} from "../web/sheetLink";

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

function readState(metadata: Record<string, unknown>): AlborState {
  return parseState(metadata[METADATA_KEY] as Partial<AlborState> | undefined);
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

function localHasContent(state: AlborState): boolean {
  return state.characters.length > 0;
}

function writeMappedCharactersToLocal(room: AlborState, map: PlayerSyncMap): void {
  if (Object.keys(map).length === 0) return;
  const local = readLocalState();
  let chars = local.characters;
  let changed = false;
  for (const [assignedId, localId] of Object.entries(map)) {
    const assigned = room.characters.find((c) => c.id === assignedId);
    if (!assigned) continue;
    const idx = chars.findIndex((c) => c.id === localId);
    const previous = idx >= 0 ? chars[idx] : null;
    const overlaid: AlborCharacter = {
      ...assigned,
      id: localId,
      ownerId: previous?.ownerId ?? null,
    };
    if (previous && JSON.stringify(previous) === JSON.stringify(overlaid)) continue;
    changed = true;
    chars =
      idx >= 0
        ? chars.map((c, i) => (i === idx ? overlaid : c))
        : [...chars, overlaid];
  }
  if (changed) writeLocalState({ ...local, characters: chars });
}

function applyPlayerMapsToRoom(room: AlborState, map: PlayerSyncMap): AlborState {
  const local = readLocalState();
  let chars = room.characters;
  let changed = false;
  for (const [assignedId, localId] of Object.entries(map)) {
    const localChar = local.characters.find((c) => c.id === localId);
    const assigned = chars.find((c) => c.id === assignedId);
    if (!localChar || !assigned) continue;
    const overlaid = copySheetOnto(assigned, localChar);
    if (JSON.stringify(assigned) === JSON.stringify(overlaid)) continue;
    changed = true;
    chars = chars.map((c) => (c.id === assignedId ? overlaid : c));
  }
  return changed ? { ...room, characters: chars } : room;
}

export function useRoster() {
  const [state, setState] = useState<AlborState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [syncWithLocal, setSyncWithLocalState] = useState(false);
  const [playerSync, setPlayerSync] = useState<PlayerSyncMap>({});
  const [localCharacters, setLocalCharacters] = useState<AlborCharacter[]>([]);
  const stateRef = useRef<AlborState>(EMPTY_STATE);
  const syncRef = useRef(false);
  const playerSyncRef = useRef<PlayerSyncMap>({});

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    syncRef.current = syncWithLocal;
  }, [syncWithLocal]);

  useEffect(() => {
    playerSyncRef.current = playerSync;
  }, [playerSync]);

  useEffect(() => {
    if (!OBR.isAvailable) {
      const initial = readLocalState();
      stateRef.current = initial;
      setState(initial);
      setLocalCharacters(initial.characters);
      setReady(true);

      const onStorage = (event: StorageEvent) => {
        if (event.key !== WEB_STATE_KEY || !event.newValue) return;
        try {
          const parsed = parseState(JSON.parse(event.newValue) as Partial<AlborState>);
          stateRef.current = parsed;
          setState(parsed);
          setLocalCharacters(parsed.characters);
        } catch {
          // ignore
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }

    let unsubscribe: (() => void) | undefined;

    OBR.onReady(async () => {
      const metadata = await OBR.room.getMetadata();
      const initial = readState(metadata);
      const wantSync = isLocalSyncEnabled();
      const map = readPlayerSyncMap();
      syncRef.current = wantSync;
      playerSyncRef.current = map;
      setSyncWithLocalState(wantSync);
      setPlayerSync(map);
      setLocalCharacters(readLocalState().characters);

      if (wantSync) {
        const local = readLocalState();
        if (localHasContent(local) && !localHasContent(initial)) {
          stateRef.current = local;
          setState(local);
          setReady(true);
          await OBR.room.setMetadata({ [METADATA_KEY]: local });
        } else {
          stateRef.current = initial;
          setState(initial);
          setReady(true);
          writeLocalState(initial);
        }
      } else {
        const applied = applyPlayerMapsToRoom(initial, map);
        stateRef.current = applied;
        setState(applied);
        setReady(true);
        if (applied !== initial) {
          await OBR.room.setMetadata({ [METADATA_KEY]: applied });
        }
        writeMappedCharactersToLocal(applied, map);
      }

      unsubscribe = OBR.room.onMetadataChange((next) => {
        const parsed = readState(next);
        stateRef.current = parsed;
        setState(parsed);
        if (syncRef.current) writeLocalState(parsed);
        else writeMappedCharactersToLocal(parsed, playerSyncRef.current);
      });
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key !== WEB_STATE_KEY || !event.newValue) return;
      try {
        const parsed = parseState(JSON.parse(event.newValue) as Partial<AlborState>);
        setLocalCharacters(parsed.characters);
        if (syncRef.current) {
          stateRef.current = parsed;
          setState(parsed);
          void OBR.room.setMetadata({ [METADATA_KEY]: parsed });
          return;
        }
        const map = playerSyncRef.current;
        if (Object.keys(map).length === 0) return;
        const applied = applyPlayerMapsToRoom(stateRef.current, map);
        if (applied === stateRef.current) return;
        stateRef.current = applied;
        setState(applied);
        void OBR.room.setMetadata({ [METADATA_KEY]: applied });
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      unsubscribe?.();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const commit = useCallback(async (next: AlborState) => {
    stateRef.current = next;
    setState(next);
    if (!OBR.isAvailable) {
      writeLocalState(next);
      return;
    }
    await OBR.room.setMetadata({ [METADATA_KEY]: next });
    if (syncRef.current) writeLocalState(next);
    else writeMappedCharactersToLocal(next, playerSyncRef.current);
  }, []);

  const setSyncWithLocal = useCallback(
    async (enabled: boolean) => {
      if (!OBR.isAvailable) return;

      if (!enabled) {
        setLocalSyncEnabled(false);
        syncRef.current = false;
        setSyncWithLocalState(false);
        return;
      }

      const local = readLocalState();
      if (localHasContent(local)) {
        const ok = window.confirm(
          "Se van a reemplazar las fichas de esta sala con las guardadas en este navegador. ¿Continuar?",
        );
        if (!ok) return;
        setLocalSyncEnabled(true);
        syncRef.current = true;
        setSyncWithLocalState(true);
        await commit(local);
        return;
      }

      setLocalSyncEnabled(true);
      syncRef.current = true;
      setSyncWithLocalState(true);
      writeLocalState(stateRef.current);
    },
    [commit],
  );

  const syncPlayerCharacter = useCallback(
    async (assignedId: string, localId: string) => {
      if (!OBR.isAvailable) return;
      const assigned = stateRef.current.characters.find((c) => c.id === assignedId);
      const localChar = readLocalState().characters.find((c) => c.id === localId);
      if (!assigned || !localChar) return;
      const ok = window.confirm(
        `Se va a copiar la ficha local "${localChar.nombre || "Sin nombre"}" sobre el PJ asignado "${assigned.nombre || "Sin nombre"}". ¿Continuar?`,
      );
      if (!ok) return;
      const map = { ...playerSyncRef.current, [assignedId]: localId };
      writePlayerSyncMap(map);
      playerSyncRef.current = map;
      setPlayerSync(map);
      const next = {
        ...stateRef.current,
        characters: stateRef.current.characters.map((c) =>
          c.id === assignedId ? copySheetOnto(c, localChar) : c,
        ),
      };
      await commit(next);
    },
    [commit],
  );

  const unsyncPlayerCharacter = useCallback((assignedId: string) => {
    const rest = { ...playerSyncRef.current };
    delete rest[assignedId];
    writePlayerSyncMap(rest);
    playerSyncRef.current = rest;
    setPlayerSync(rest);
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
    (id: string, patch: Partial<AlborCharacter>) =>
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

  const assignOwner = useCallback(
    (id: string, ownerId: string | null) => updateCharacter(id, { ownerId }),
    [updateCharacter],
  );

  const setDicePlusEnabled = useCallback(
    (dicePlusEnabled: boolean) =>
      commit({ ...stateRef.current, dicePlusEnabled }),
    [commit],
  );

  const addDiceRoll = useCallback(
    (input: Omit<DiceRollLogEntry, "id" | "timestamp">) => {
      const entry = makeDiceRollLogEntry(input);
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

  return {
    state,
    ready,
    syncWithLocal,
    setSyncWithLocal,
    playerSync,
    localCharacters,
    syncPlayerCharacter,
    unsyncPlayerCharacter,
    addCharacter,
    updateCharacter,
    removeCharacter,
    assignOwner,
    setDicePlusEnabled,
    addDiceRoll,
    clearDiceLog,
    replaceState,
  };
}

export type Roster = ReturnType<typeof useRoster>;
