import { useEffect } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { DICE_ROLL_CHANNEL, DiceRollBroadcast } from "../types";

const seenToasts = new Set<string>();

function claimToast(payload: DiceRollBroadcast): boolean {
  if (!payload.id) return true;
  if (seenToasts.has(payload.id)) return false;
  seenToasts.add(payload.id);
  if (seenToasts.size > 200) {
    const oldest = seenToasts.values().next().value;
    if (oldest) seenToasts.delete(oldest);
  }
  return true;
}

function showDiceToast(payload: DiceRollBroadcast) {
  const kind = payload.critical ? "SUCCESS" : payload.fumble ? "WARNING" : "DEFAULT";
  OBR.notification.show(`🎲 ${payload.characterName}: ${payload.summary}`, kind);
}

export function broadcastDiceRoll(payload: DiceRollBroadcast) {
  if (!OBR.isAvailable) return;
  OBR.broadcast.sendMessage(DICE_ROLL_CHANNEL, payload, {
    destination: "REMOTE",
  });
}

export function notifyDiceRoll(payload: DiceRollBroadcast) {
  if (!OBR.isAvailable || !claimToast(payload)) return;
  OBR.onReady(() => {
    showDiceToast(payload);
  });
}

export function useDiceRollFeed() {
  useEffect(() => {
    if (!OBR.isAvailable) return;

    let unsubscribe: (() => void) | undefined;

    OBR.onReady(() => {
      unsubscribe = OBR.broadcast.onMessage(DICE_ROLL_CHANNEL, (event) => {
        const payload = event.data as DiceRollBroadcast | undefined;
        if (!payload || !claimToast(payload)) return;
        showDiceToast(payload);
      });
    });

    return () => unsubscribe?.();
  }, []);
}
