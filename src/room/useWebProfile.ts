import { useCallback, useState } from "react";
import { WEB_PROFILE_KEY, type RoomRole } from "./protocol";

export interface WebProfile {
  id: string;
  name: string;
  role: RoomRole;
}

function readProfile(): WebProfile {
  try {
    const raw = localStorage.getItem(WEB_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WebProfile>;
      if (typeof parsed.id === "string" && parsed.id) {
        return {
          id: parsed.id,
          name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : "Web",
          role: parsed.role === "PLAYER" ? "PLAYER" : "GM",
        };
      }
    }
  } catch {
    // private mode or corrupt
  }
  const created: WebProfile = { id: crypto.randomUUID(), name: "Web", role: "GM" };
  try {
    localStorage.setItem(WEB_PROFILE_KEY, JSON.stringify(created));
  } catch {
    // private mode
  }
  return created;
}

export function useWebProfile() {
  const [profile, setProfile] = useState<WebProfile>(readProfile);

  const write = useCallback((next: WebProfile) => {
    setProfile(next);
    try {
      localStorage.setItem(WEB_PROFILE_KEY, JSON.stringify(next));
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
