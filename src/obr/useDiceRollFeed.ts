import { useEffect } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { DICE_ROLL_CHANNEL, DiceRollBroadcast } from "../types";

export function broadcastDiceRoll(payload: DiceRollBroadcast) {
  if (!OBR.isAvailable) return;
  OBR.broadcast.sendMessage(DICE_ROLL_CHANNEL, payload, {
    destination: "REMOTE",
  });
}

export function notifyDiceRoll(payload: DiceRollBroadcast) {
  if (!OBR.isAvailable) return;
  const kind = payload.critical ? "SUCCESS" : payload.fumble ? "WARNING" : "DEFAULT";
  OBR.onReady(() => {
    OBR.notification.show(`🎲 ${payload.characterName}: ${payload.summary}`, kind);
  });
}

export function useDiceRollFeed() {
  useEffect(() => {
    if (!OBR.isAvailable) return;

    let unsubscribe: (() => void) | undefined;

    OBR.onReady(() => {
      unsubscribe = OBR.broadcast.onMessage(DICE_ROLL_CHANNEL, (event) => {
        const payload = event.data as DiceRollBroadcast | undefined;
        if (!payload) return;
        const kind = payload.critical
          ? "SUCCESS"
          : payload.fumble
            ? "WARNING"
            : "DEFAULT";
        OBR.notification.show(`🎲 ${payload.characterName}: ${payload.summary}`, kind);
      });
    });

    return () => unsubscribe?.();
  }, []);
}
