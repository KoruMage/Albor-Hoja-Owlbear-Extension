import type { DieSize } from "../types";
import {
  buildAlborNotation,
  invalidateDicePlusReady,
  isDicePlusReady,
  parseAlborDice,
  requestDicePlusRoll,
} from "../obr/dicePlus";

export function rollDie(size: DieSize): number {
  return 1 + Math.floor(Math.random() * size);
}

export function rollLocalPool(count: number, dieSize: DieSize): number[] {
  return Array.from({ length: Math.max(1, count) }, () => rollDie(dieSize));
}

export async function performAlborRoll(input: {
  count: number;
  dieSize: DieSize;
  label: string;
  dicePlusEnabled: boolean;
}): Promise<{ faces: number[]; viaDicePlus: boolean; error: string | null }> {
  const count = Math.max(1, input.count);
  const notation = buildAlborNotation({
    count,
    dieSize: input.dieSize,
    label: input.label,
  });

  try {
    if (input.dicePlusEnabled) {
      const ready = await isDicePlusReady();
      if (ready) {
        const result = await requestDicePlusRoll({ diceNotation: notation });
        let faces = parseAlborDice(result);
        if (faces.length === 0 && result.result.totalValue) {
          faces = [result.result.totalValue];
        }
        if (faces.length === 0) faces = rollLocalPool(count, input.dieSize);
        return { faces, viaDicePlus: true, error: null };
      }
    }
    return { faces: rollLocalPool(count, input.dieSize), viaDicePlus: false, error: null };
  } catch (err) {
    invalidateDicePlusReady();
    return {
      faces: rollLocalPool(count, input.dieSize),
      viaDicePlus: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
