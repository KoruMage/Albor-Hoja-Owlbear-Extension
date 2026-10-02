import { useCallback, useEffect, useRef, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import type { AlborCharacter, DiceRollLogEntry } from "../types";
import { notifyDiceRoll } from "../obr/useDiceRollFeed";
import {
  ROOM_POINTER_KEY,
  ROOM_SESSION_KEY,
  roomHttpBase,
  roomWsUrl,
  type RemoteSheets,
  type RoomMember,
  type RoomSession,
  type ServerMessage,
} from "./protocol";

export type RoomStatus = "idle" | "connecting" | "open" | "error";

function readSession(): RoomSession | null {
  try {
    const raw = localStorage.getItem(ROOM_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RoomSession>;
    if (typeof parsed.code !== "string" || !parsed.code) return null;
    return {
      code: parsed.code.toUpperCase(),
      gmToken: typeof parsed.gmToken === "string" ? parsed.gmToken : undefined,
      asGM: Boolean(parsed.asGM && parsed.gmToken),
    };
  } catch {
    return null;
  }
}

function writeSession(session: RoomSession | null): void {
  try {
    if (!session) localStorage.removeItem(ROOM_SESSION_KEY);
    else localStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(session));
  } catch {
    // private mode
  }
}

function writeRoomPointer(code: string): void {
  if (!OBR.isAvailable) return;
  OBR.onReady(() => {
    void OBR.room.setMetadata({ [ROOM_POINTER_KEY]: code });
  });
}

interface RoomHandlers {
  playerId: string | null;
  playerName: string | null;
  isGM: boolean;
  onWelcome: (diceLog: DiceRollLogEntry[], dicePlusEnabled: boolean) => void;
  onDice: (entry: DiceRollLogEntry) => void;
  onDicePlus: (enabled: boolean) => void;
  onDiceCleared: () => void;
}

export function useRoom(handlers: RoomHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [session, setSession] = useState<RoomSession | null>(readSession);
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [remoteSheets, setRemoteSheets] = useState<RemoteSheets[]>([]);
  const [advertisedCode, setAdvertisedCode] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<RoomSession | null>(session);
  sessionRef.current = session;
  const retryRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const generationRef = useRef(0);

  const clearRetry = () => {
    if (retryRef.current !== null) window.clearTimeout(retryRef.current);
    retryRef.current = null;
  };

  const applyMessage = useCallback((message: ServerMessage) => {
    if (message.type === "welcome") {
      attemptsRef.current = 0;
      setStatus("open");
      setError(null);
      handlersRef.current.onWelcome(message.diceLog, message.dicePlusEnabled);
      return;
    }
    if (message.type === "presence") {
      setMembers(message.members);
      return;
    }
    if (message.type === "roster") {
      setRemoteSheets(message.sheets);
      return;
    }
    if (message.type === "sheets") {
      setRemoteSheets((prev) => {
        const rest = prev.filter((item) => item.playerId !== message.playerId);
        return [...rest, { playerId: message.playerId, name: message.name, characters: message.characters }];
      });
      return;
    }
    if (message.type === "dice") {
      handlersRef.current.onDice(message.entry);
      if (message.playerId !== handlersRef.current.playerId) notifyDiceRoll(message.entry);
      return;
    }
    if (message.type === "dicePlus") {
      handlersRef.current.onDicePlus(message.enabled);
      return;
    }
    if (message.type === "diceCleared") {
      handlersRef.current.onDiceCleared();
      return;
    }
    if (message.type === "error") setError(message.message);
  }, []);

  const connect = useCallback(
    (next: RoomSession) => {
      clearRetry();
      const generation = generationRef.current + 1;
      generationRef.current = generation;
      const previous = wsRef.current;
      wsRef.current = null;
      previous?.close();
      const playerId = handlersRef.current.playerId;
      if (!playerId) return;
      setStatus("connecting");
      setError(null);
      const ws = new WebSocket(roomWsUrl(next.code));
      wsRef.current = ws;
      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        ws.send(
          JSON.stringify({
            type: "hello",
            playerId,
            name: handlersRef.current.playerName || (next.asGM ? "Director" : "Jugador"),
            role: next.asGM ? "GM" : "PLAYER",
            gmToken: next.gmToken,
          }),
        );
      };
      ws.onmessage = (event) => {
        if (generationRef.current !== generation || typeof event.data !== "string") return;
        try {
          applyMessage(JSON.parse(event.data) as ServerMessage);
        } catch {
          setError("La sala mandó un mensaje ilegible.");
        }
      };
      ws.onclose = (event) => {
        if (generationRef.current !== generation) return;
        wsRef.current = null;
        if (event.code === 4001 || event.code === 1008) {
          attemptsRef.current = 0;
          setStatus("error");
          setError((prev) => prev || "No se pudo entrar a la sala.");
          return;
        }
        const current = sessionRef.current;
        if (!current || current.code !== next.code) {
          setStatus("idle");
          return;
        }
        attemptsRef.current += 1;
        if (attemptsRef.current > 3) {
          setStatus("error");
          setError("No se pudo conectar con la sala. Comprobá que el servidor de salas esté en marcha.");
          return;
        }
        setStatus("connecting");
        retryRef.current = window.setTimeout(() => {
          if (sessionRef.current?.code === next.code) connect(next);
        }, 2000);
      };
      ws.onerror = () => {
        if (wsRef.current === ws) setError("No hay conexión con la sala.");
      };
    },
    [applyMessage],
  );

  useEffect(() => {
    if (!OBR.isAvailable) return;
    let unsubscribe: (() => void) | undefined;
    OBR.onReady(() => {
      void OBR.room.getMetadata().then((metadata) => {
        const code = metadata[ROOM_POINTER_KEY];
        setAdvertisedCode(typeof code === "string" && code ? code : null);
      });
      unsubscribe = OBR.room.onMetadataChange((metadata) => {
        const code = metadata[ROOM_POINTER_KEY];
        setAdvertisedCode(typeof code === "string" && code ? code : null);
      });
    });
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    const playerId = handlers.playerId;
    const current = sessionRef.current;
    if (!playerId || !current) return;
    if (current.asGM !== handlers.isGM) {
      writeSession(null);
      setSession(null);
      setStatus("idle");
      return;
    }
    connect(current);
    return () => {
      clearRetry();
      generationRef.current += 1;
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, [handlers.playerId, handlers.isGM, session?.code, session?.asGM, connect]);

  const publishSheets = useCallback((characters: AlborCharacter[]) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "sheets", characters }));
  }, []);

  const sendDice = useCallback((entry: DiceRollLogEntry) => {
    const ws = wsRef.current;
    const playerId = handlersRef.current.playerId;
    if (!ws || ws.readyState !== WebSocket.OPEN || !playerId) return;
    ws.send(JSON.stringify({ type: "dice", playerId, entry }));
  }, []);

  const sendDicePlus = useCallback((enabled: boolean) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "dicePlus", enabled }));
  }, []);

  const sendClearDice = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "clearDice" }));
  }, []);

  const createRoom = useCallback(async () => {
    if (!handlersRef.current.isGM) return;
    setError(null);
    setStatus("connecting");
    try {
      const response = await fetch(`${roomHttpBase()}/rooms`, { method: "POST" });
      if (!response.ok) throw new Error("No se pudo crear la sala.");
      const body = (await response.json()) as { code?: string; gmToken?: string };
      if (!body.code || !body.gmToken) throw new Error("La sala no devolvió un código.");
      const next: RoomSession = { code: body.code, gmToken: body.gmToken, asGM: true };
      writeSession(next);
      writeRoomPointer(body.code);
      setRemoteSheets([]);
      setMembers([]);
      setSession(next);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "No se pudo crear la sala.");
    }
  }, []);

  const joinRoom = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(normalized)) {
      setError("El código tiene 6 letras o números.");
      setStatus("error");
      return;
    }
    const next: RoomSession = { code: normalized, asGM: false };
    writeSession(next);
    setRemoteSheets([]);
    setMembers([]);
    setError(null);
    setSession(next);
  }, []);

  const leaveRoom = useCallback(() => {
    clearRetry();
    generationRef.current += 1;
    const current = sessionRef.current;
    sessionRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    ws?.close();
    writeSession(null);
    setSession(null);
    setMembers([]);
    setRemoteSheets([]);
    setStatus("idle");
    setError(null);
    if (current?.asGM) writeRoomPointer("");
  }, []);

  return {
    status,
    error,
    code: session?.code ?? null,
    asGM: Boolean(session?.asGM),
    members,
    remoteSheets,
    advertisedCode,
    publishSheets,
    sendDice,
    sendDicePlus,
    sendClearDice,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}

export type RoomClient = ReturnType<typeof useRoom>;
