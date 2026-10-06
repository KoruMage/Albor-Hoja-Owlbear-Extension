import { ROOM_SESSION_KEY, WEB_PROFILE_KEY } from "../room/protocol";
import { THEME_KEY } from "../theme";
import { absorbStorage, appStorage } from "./appStorage";
import { appPageUrl, WEB_STATE_KEY } from "./sheetLink";

const READY = "albor-bridge-ready";
const STATE = "albor-bridge";

interface BridgePayload {
  type: typeof STATE;
  entries: [string, string][];
}

const peers = new Set<Window>();
let publishing = false;
let listening = false;

function snapshot(): BridgePayload {
  const store = appStorage();
  const entries: [string, string][] = [];
  for (const key of [WEB_STATE_KEY, THEME_KEY, ROOM_SESSION_KEY, WEB_PROFILE_KEY]) {
    const value = store.getItem(key);
    if (value !== null) entries.push([key, value]);
  }
  return { type: STATE, entries };
}

function post(target: Window): void {
  if (target.closed) {
    peers.delete(target);
    return;
  }
  target.postMessage(snapshot(), window.location.origin);
}

function remember(target: Window): void {
  if (target === window || target.closed) return;
  peers.add(target);
}

export function startStorageBridge(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as { type?: string; entries?: [string, string][] } | null;
    if (!data || typeof data.type !== "string") return;
    const source = event.source;
    if (!source || !("postMessage" in source)) return;
    const peer = source as Window;
    if (data.type === READY) {
      remember(peer);
      post(peer);
      return;
    }
    if (data.type !== STATE || !Array.isArray(data.entries)) return;
    remember(peer);
    const entries = data.entries.filter(
      (entry): entry is [string, string] =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        typeof entry[1] === "string",
    );
    publishing = true;
    try {
      const changed = absorbStorage(new Map(entries));
      if (changed) post(peer);
    } finally {
      publishing = false;
    }
  });
  if (window.opener && window.opener !== window) {
    remember(window.opener as Window);
    window.opener.postMessage({ type: READY }, window.location.origin);
  }
}

export function publishStorageBridge(): void {
  if (publishing) return;
  for (const peer of [...peers]) post(peer);
}

export function openBridgedApp(): Window | null {
  startStorageBridge();
  const popup = window.open(appPageUrl(), "_blank");
  if (!popup) return null;
  remember(popup);
  return popup;
}
