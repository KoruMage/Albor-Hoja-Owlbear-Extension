import { AlborCharacter, normalizeCharacter } from "../types";
import { appStorage } from "./appStorage";

export const WEB_STATE_KEY = "com.albor/web-state";
export const WEB_SHEET_PREFIX = "com.albor/web-sheet:";

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
    appStorage().setItem(
      `${WEB_SHEET_PREFIX}${character.id}`,
      JSON.stringify({ ...character, ownerId: null }),
    );
  } catch {
    // Quota or private mode
  }
}

export function readCachedSheet(id: string): AlborCharacter | null {
  try {
    const raw = appStorage().getItem(`${WEB_SHEET_PREFIX}${id}`);
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

export function appPageUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("view");
  url.searchParams.delete("id");
  url.hash = "";
  return url.toString();
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
