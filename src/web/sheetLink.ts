import { AlborCharacter, normalizeCharacter } from "../types";

export const WEB_STATE_KEY = "com.albor/web-state";
export const WEB_SHEET_PREFIX = "com.albor/web-sheet:";
export const SYNC_LOCAL_KEY = "com.albor/sync-with-local";
export const PLAYER_SYNC_KEY = "com.albor/player-sync";

export type PlayerSyncMap = Record<string, string>;

export function isLocalSyncEnabled(): boolean {
  try {
    return localStorage.getItem(SYNC_LOCAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLocalSyncEnabled(value: boolean): void {
  try {
    if (value) localStorage.setItem(SYNC_LOCAL_KEY, "1");
    else localStorage.removeItem(SYNC_LOCAL_KEY);
  } catch {
    // private mode
  }
}

export function readPlayerSyncMap(): PlayerSyncMap {
  try {
    const raw = localStorage.getItem(PLAYER_SYNC_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const map: PlayerSyncMap = {};
    for (const [assignedId, localId] of Object.entries(parsed)) {
      if (typeof localId === "string" && localId) map[assignedId] = localId;
    }
    return map;
  } catch {
    return {};
  }
}

export function writePlayerSyncMap(map: PlayerSyncMap): void {
  try {
    if (Object.keys(map).length === 0) localStorage.removeItem(PLAYER_SYNC_KEY);
    else localStorage.setItem(PLAYER_SYNC_KEY, JSON.stringify(map));
  } catch {
    // private mode
  }
}

export function suggestLocalCharacter(
  assigned: AlborCharacter,
  localCharacters: AlborCharacter[],
): AlborCharacter | null {
  if (localCharacters.length === 0) return null;
  const byId = localCharacters.find((c) => c.id === assigned.id);
  if (byId) return byId;
  const assignedName = assigned.nombre.trim().toLowerCase();
  if (assignedName) {
    const byName = localCharacters.find(
      (c) => c.nombre.trim().toLowerCase() === assignedName,
    );
    if (byName) return byName;
  }
  if (localCharacters.length === 1) return localCharacters[0];
  return null;
}

export function isSheetView(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("view") === "sheet";
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(payload: string): Uint8Array {
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64 + "===".slice((b64.length + 3) % 4);
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeSheetPayload(character: AlborCharacter): string {
  const snapshot: AlborCharacter = { ...character, ownerId: null };
  const json = JSON.stringify(snapshot);
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeSheetPayload(payload: string): AlborCharacter | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(payload));
    const parsed = JSON.parse(json) as Partial<AlborCharacter>;
    return normalizeCharacter(parsed);
  } catch {
    return null;
  }
}

export function cacheSheetLocally(character: AlborCharacter): void {
  try {
    localStorage.setItem(
      `${WEB_SHEET_PREFIX}${character.id}`,
      JSON.stringify({ ...character, ownerId: null }),
    );
  } catch {
    // Quota or private mode
  }
}

export function readCachedSheet(id: string): AlborCharacter | null {
  try {
    const raw = localStorage.getItem(`${WEB_SHEET_PREFIX}${id}`);
    if (!raw) return null;
    return normalizeCharacter(JSON.parse(raw) as Partial<AlborCharacter>);
  } catch {
    return null;
  }
}

export function parseSheetFromLocation(): AlborCharacter | null {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const fromHash = decodeSheetPayload(hash);
    if (fromHash) return fromHash;
  }
  const id = params.get("id");
  if (id) return readCachedSheet(id);
  return null;
}

export function buildSheetUrl(character: AlborCharacter): string {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "sheet");
  url.searchParams.set("id", character.id);
  url.hash = encodeSheetPayload(character);
  return url.toString();
}

export async function openSheetInBrowser(
  character: AlborCharacter,
): Promise<"opened" | "copied" | "failed"> {
  cacheSheetLocally(character);
  const url = buildSheetUrl(character);
  const popup = window.open(url, "_blank", "noopener");
  if (popup) return "opened";
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

export async function copySheetUrl(character: AlborCharacter): Promise<boolean> {
  cacheSheetLocally(character);
  try {
    await navigator.clipboard.writeText(buildSheetUrl(character));
    return true;
  } catch {
    return false;
  }
}
