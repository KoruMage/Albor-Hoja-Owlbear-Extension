import { useEffect, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";

export type Role = "GM" | "PLAYER";

export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);

  useEffect(() => {
    if (!OBR.isAvailable) {
      setRole("GM");
      setPlayerId("web-user");
      setPlayerName("Web");
      return;
    }

    let unsubscribe: (() => void) | undefined;

    OBR.onReady(async () => {
      const [currentRole, id, name] = await Promise.all([
        OBR.player.getRole(),
        OBR.player.getId(),
        OBR.player.getName(),
      ]);
      setRole(currentRole);
      setPlayerId(id);
      setPlayerName(name);

      unsubscribe = OBR.player.onChange((player) => {
        setRole(player.role);
        setPlayerId(player.id);
        setPlayerName(player.name);
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  return { role, playerId, playerName, isGM: role === "GM" };
}
