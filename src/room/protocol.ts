import type { AlborCharacter, DiceRollLogEntry } from "../types";

export const ROOM_POINTER_KEY = "com.albor/room";
export const ROOM_SESSION_KEY = "com.albor/room-session";
export const WEB_PROFILE_KEY = "com.albor/web-profile";

export type RoomRole = "GM" | "PLAYER";

export interface RoomMember {
  playerId: string;
  name: string;
  role: RoomRole;
  connected: boolean;
}

export interface RemoteSheets {
  playerId: string;
  name: string;
  characters: AlborCharacter[];
}

export interface RoomSession {
  code: string;
  gmToken?: string;
  asGM: boolean;
}

export type ClientMessage =
  | {
      type: "hello";
      playerId: string;
      name: string;
      role: RoomRole;
      gmToken?: string;
    }
  | { type: "sheets"; characters: AlborCharacter[] }
  | { type: "assign"; character: AlborCharacter; targetPlayerId: string }
  | { type: "editSheet"; targetPlayerId: string; character: AlborCharacter }
  | { type: "dice"; playerId: string; entry: DiceRollLogEntry }
  | { type: "dicePlus"; enabled: boolean }
  | { type: "clearDice" };

export type ServerMessage =
  | { type: "welcome"; dicePlusEnabled: boolean; diceLog: DiceRollLogEntry[] }
  | { type: "presence"; members: RoomMember[] }
  | { type: "roster"; sheets: RemoteSheets[] }
  | { type: "sheets"; playerId: string; name: string; characters: AlborCharacter[] }
  | { type: "sheetUpsert"; character: AlborCharacter }
  | { type: "assigned"; characterId: string; targetPlayerId: string }
  | { type: "dice"; playerId: string; entry: DiceRollLogEntry }
  | { type: "dicePlus"; enabled: boolean }
  | { type: "diceCleared" }
  | { type: "error"; message: string };

export function roomHttpBase(): string {
  const configured = import.meta.env.VITE_ROOM_URL;
  if (typeof configured === "string" && configured.trim()) return configured.replace(/\/$/, "");
  return "";
}

export function roomWsUrl(code: string): string {
  const base = roomHttpBase();
  if (!base) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/rooms/${encodeURIComponent(code)}`;
  }
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/rooms/${encodeURIComponent(code)}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}
