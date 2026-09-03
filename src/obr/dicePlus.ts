import OBR from "@owlbear-rodeo/sdk";
import type { DieSize } from "../types";

export const EXTENSION_ID = "com.albor";

const READY_CHANNEL = "dice-plus/isReady";
const ROLL_REQUEST_CHANNEL = "dice-plus/roll-request";
const ROLL_RESULT_CHANNEL = `${EXTENSION_ID}/roll-result`;
const ROLL_ERROR_CHANNEL = `${EXTENSION_ID}/roll-error`;

export type DicePlusRollTarget = "everyone" | "self" | "dm" | "gm_only";

export interface DicePlusDie {
  diceId: string;
  rollId: string;
  diceType: string;
  value: number;
  kept: boolean;
}

export interface DicePlusGroup {
  description?: string;
  diceModel?: string;
  diceType: string;
  dice: DicePlusDie[];
  total: number;
  isNegative?: boolean;
}

export interface DicePlusRollResult {
  rollId: string;
  playerId: string;
  playerName: string;
  rollTarget: DicePlusRollTarget;
  timestamp: number;
  result: {
    rollId: string;
    diceNotation: string;
    totalValue: number;
    rollSummary: string;
    groups: DicePlusGroup[];
  };
}

interface DicePlusRollError {
  rollId: string;
  error: string;
  notation: string;
}

type Pending = {
  resolve: (result: DicePlusRollResult) => void;
  reject: (error: Error) => void;
};

const pending = new Map<string, Pending>();
let listenersBound = false;
let cachedReady: boolean | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRollResult(value: unknown): value is DicePlusRollResult {
  if (!isRecord(value) || typeof value.rollId !== "string") return false;
  return isRecord(value.result) && typeof value.result.totalValue === "number";
}

function isRollError(value: unknown): value is DicePlusRollError {
  return (
    isRecord(value) &&
    typeof value.rollId === "string" &&
    typeof value.error === "string"
  );
}

export function bindDicePlusListeners() {
  if (!OBR.isAvailable) return;
  if (listenersBound) return;
  listenersBound = true;

  OBR.broadcast.onMessage(ROLL_RESULT_CHANNEL, (event) => {
    if (!isRollResult(event.data)) return;
    const waiter = pending.get(event.data.rollId);
    if (!waiter) return;
    pending.delete(event.data.rollId);
    waiter.resolve(event.data);
  });

  OBR.broadcast.onMessage(ROLL_ERROR_CHANNEL, (event) => {
    if (!isRollError(event.data)) return;
    const waiter = pending.get(event.data.rollId);
    if (!waiter) return;
    pending.delete(event.data.rollId);
    waiter.reject(new Error(event.data.error));
  });
}

export async function isDicePlusReady(): Promise<boolean> {
  if (!OBR.isAvailable) return false;
  if (cachedReady !== null) return cachedReady;
  cachedReady = await pingDicePlus();
  return cachedReady;
}

export function invalidateDicePlusReady() {
  cachedReady = null;
}

async function pingDicePlus(timeoutMs = 1000): Promise<boolean> {
  const requestId = `ready_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  return new Promise((resolve) => {
    const unsubscribe = OBR.broadcast.onMessage(READY_CHANNEL, (event) => {
      const data = event.data;
      if (!isRecord(data)) return;
      if (!("ready" in data) || data.requestId !== requestId) return;
      clearTimeout(timer);
      unsubscribe();
      resolve(true);
    });

    void OBR.broadcast.sendMessage(
      READY_CHANNEL,
      { requestId, timestamp: Date.now() },
      { destination: "ALL" },
    );

    const timer = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);
  });
}

export interface RequestDicePlusRollOptions {
  diceNotation: string;
  showResults?: boolean;
  rollTarget?: DicePlusRollTarget;
  timeoutMs?: number;
}

export async function requestDicePlusRoll(
  options: RequestDicePlusRollOptions,
): Promise<DicePlusRollResult> {
  if (!OBR.isAvailable) {
    throw new Error("Dice+ solo funciona dentro de Owlbear");
  }
  bindDicePlusListeners();

  const rollId = `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const [playerId, playerName] = await Promise.all([
    OBR.player.getId(),
    OBR.player.getName(),
  ]);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(rollId);
      reject(new Error("Dice+ no respondio a tiempo"));
    }, options.timeoutMs ?? 45000);

    pending.set(rollId, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });

    void OBR.broadcast
      .sendMessage(
        ROLL_REQUEST_CHANNEL,
        {
          rollId,
          playerId,
          playerName,
          rollTarget: options.rollTarget ?? "everyone",
          diceNotation: options.diceNotation,
          showResults: options.showResults ?? true,
          timestamp: Date.now(),
          source: EXTENSION_ID,
        },
        { destination: "ALL" },
      )
      .catch((err: unknown) => {
        pending.delete(rollId);
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

export function sanitizeDiceLabel(text: string): string {
  return text
    .replace(/[#{}+]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export function buildAlborNotation(input: {
  count: number;
  dieSize: DieSize;
  label: string;
}): string {
  const label = sanitizeDiceLabel(input.label) || "Tirada";
  const count = Math.max(1, input.count);
  return `${count}d${input.dieSize} # ${label}`;
}

export function parseAlborDice(result: DicePlusRollResult): number[] {
  const faces: number[] = [];
  for (const group of result.result.groups ?? []) {
    const kept = (group.dice ?? []).filter((die) => die.kept);
    for (const die of kept) faces.push(die.value);
  }
  return faces;
}
