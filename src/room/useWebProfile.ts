import { useCallback, useEffect, useState } from "react";
import { appStorage, onAppStorageChange } from "../web/appStorage";
import { WEB_PROFILE_KEY, type RoomRole } from "./protocol";

export interface WebProfile {
  id: string;
  name: string;
  role: RoomRole;
}

function readProfile(): WebProfile | null {
  try {
    const raw = appStorage().getItem(WEB_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WebProfile>;
    if (typeof parsed.id !== "string" || !parsed.id) return null;
    return {
      id: parsed.id,
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : "Web",
      role: parsed.role === "PLAYER" ? "PLAYER" : "GM",
    };
  } catch {
    return null;
  }
}

function ensureProfile(): WebProfile {
  const existing = readProfile();
  if (existing) return existing;
  const created: WebProfile = { id: crypto.randomUUID(), name: "Web", role: "GM" };
  try {
    appStorage().setItem(WEB_PROFILE_KEY, JSON.stringify(created));
  } catch {
    // private mode
  }
  return created;
}

export function useWebProfile() {
  const [profile, setProfile] = useState<WebProfile>(ensureProfile);

  useEffect(() => {
    return onAppStorageChange(() => {
      const next = readProfile();
      if (!next) return;
      setProfile((prev) =>
        prev.id === next.id && prev.name === next.name && prev.role === next.role ? prev : next,
      );
    });
  }, []);

  const write = useCallback((next: WebProfile) => {
    setProfile(next);
    try {
      appStorage().setItem(WEB_PROFILE_KEY, JSON.stringify(next));
    } catch {
      // private mode
    }
  }, []);

  const setName = useCallback((name: string) => write({ ...profile, name }), [profile, write]);
  const setRole = useCallback(
    (role: RoomRole) => write({ ...profile, role }),
    [profile, write],
  );

  return { ...profile, setName, setRole };
}
