const PREFIX = "com.albor/";
const STATE_KEY = "com.albor/web-state";

let current: Storage = localStorage;
let shared = window.top === window.self;
let pending: Promise<boolean> | null = null;
let lastPrint = "";
const listeners = new Set<() => void>();

export function appStorage(): Storage {
  return current;
}

export function storageIsShared(): boolean {
  return shared;
}

export function storageIsEmbedded(): boolean {
  return window.top !== window.self;
}

export function onAppStorageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function fingerprint(): string {
  const store = current;
  const parts: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    parts.push(`${key}=${store.getItem(key) ?? ""}`);
  }
  parts.sort();
  return parts.join("|");
}

function emit(): void {
  lastPrint = fingerprint();
  for (const listener of [...listeners]) listener();
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mergeWebState(primaryRaw: string | null, extraRaw: string | null): string | null {
  if (!extraRaw) return primaryRaw;
  if (!primaryRaw) return extraRaw;
  try {
    const primary = JSON.parse(primaryRaw) as { characters?: unknown; diceLog?: unknown; dicePlusEnabled?: unknown };
    const extra = JSON.parse(extraRaw) as { characters?: unknown; diceLog?: unknown; dicePlusEnabled?: unknown };
    const byId = new Map<string, unknown>();
    const take = (items: unknown[]) => {
      for (const item of items) {
        if (!item || typeof item !== "object" || !("id" in item)) continue;
        const id = String((item as { id: unknown }).id);
        const existing = byId.get(id);
        if (!existing || JSON.stringify(item).length > JSON.stringify(existing).length) byId.set(id, item);
      }
    };
    take(asList(primary.characters));
    take(asList(extra.characters));
    const seen = new Set<string>();
    const diceLog: unknown[] = [];
    for (const entry of [...asList(primary.diceLog), ...asList(extra.diceLog)]) {
      if (!entry || typeof entry !== "object" || !("id" in entry)) continue;
      const id = String((entry as { id: unknown }).id);
      if (seen.has(id)) continue;
      seen.add(id);
      diceLog.push(entry);
      if (diceLog.length >= 50) break;
    }
    return JSON.stringify({
      characters: [...byId.values()],
      dicePlusEnabled: Boolean(primary.dicePlusEnabled || extra.dicePlusEnabled),
      diceLog,
    });
  } catch {
    return primaryRaw;
  }
}

function snapshot(store: Storage): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const value = store.getItem(key);
    if (value !== null) map.set(key, value);
  }
  return map;
}

function mergeInto(target: Storage, extra: Map<string, string>): void {
  const merged = mergeWebState(target.getItem(STATE_KEY), extra.get(STATE_KEY) ?? null);
  if (merged !== null && target.getItem(STATE_KEY) !== merged) target.setItem(STATE_KEY, merged);
  for (const [key, value] of extra) {
    if (key === STATE_KEY) continue;
    if (target.getItem(key) === null) target.setItem(key, value);
  }
}

export function absorbStorage(extra: Map<string, string>): boolean {
  const before = fingerprint();
  mergeInto(current, extra);
  if (fingerprint() === before) return false;
  emit();
  return true;
}

interface StorageAccessHandle {
  localStorage?: Storage;
}

async function tryAdopt(): Promise<boolean> {
  const request = document.requestStorageAccess?.bind(document) as
    | ((types?: { localStorage: boolean }) => Promise<StorageAccessHandle | void>)
    | undefined;
  if (!request) return false;
  const partitioned = snapshot(localStorage);
  const finish = (next: Storage) => {
    mergeInto(next, partitioned);
    current = next;
    shared = true;
    emit();
    return true;
  };
  try {
    const result = await request({ localStorage: true });
    const handle = result && "localStorage" in result ? result.localStorage : undefined;
    return finish(handle ?? localStorage);
  } catch (err) {
    if (!(err instanceof TypeError)) return false;
    try {
      await request();
      return finish(localStorage);
    } catch {
      return false;
    }
  }
}

export function adoptSharedStorage(): Promise<boolean> {
  if (!storageIsEmbedded()) {
    shared = true;
    return Promise.resolve(true);
  }
  if (shared) return Promise.resolve(true);
  if (pending) return pending;
  pending = tryAdopt().finally(() => {
    pending = null;
  });
  return pending;
}

window.setInterval(() => {
  if (document.visibilityState === "hidden") return;
  const next = fingerprint();
  if (next === lastPrint) return;
  emit();
}, 1000);

lastPrint = fingerprint();
