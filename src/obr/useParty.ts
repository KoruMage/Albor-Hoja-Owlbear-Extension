import { useEffect, useState } from "react";
import OBR, { type Player } from "@owlbear-rodeo/sdk";

export function useParty() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!OBR.isAvailable) return;

    let unsubscribe: (() => void) | undefined;

    OBR.onReady(async () => {
      const current = await OBR.party.getPlayers();
      setPlayers(current);
      unsubscribe = OBR.party.onChange((next) => setPlayers(next));
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  return players;
}
