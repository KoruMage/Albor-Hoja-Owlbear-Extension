import { useMemo, useState } from "react";
import {
  AlborCharacter,
  BANDS,
  DIE_SIZES,
  DieSize,
  STATS_INFO,
  StatKey,
  interpretOutcome,
  isCritical,
  nextDie,
  outcomeLabel,
} from "../types";
import {
  buildAlborNotation,
  invalidateDicePlusReady,
  isDicePlusReady,
  parseAlborDice,
  requestDicePlusRoll,
} from "../obr/dicePlus";

export interface DiceRollSummary {
  summary: string;
  total: number;
  critical: boolean;
  fumble: boolean;
  viaDicePlus: boolean;
}

function rollDie(size: DieSize): number {
  return 1 + Math.floor(Math.random() * size);
}

export function DiceRoller({
  character,
  dicePlusEnabled,
  onRolled,
}: {
  character: AlborCharacter;
  dicePlusEnabled: boolean;
  onRolled: (payload: DiceRollSummary & { characterName: string }) => void;
}) {
  const [stat, setStat] = useState<StatKey>("vig");
  const [talent, setTalent] = useState(false);
  const [extraDice, setExtraDice] = useState(0);
  const [band, setBand] = useState(BANDS[2].letter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{
    faces: number[];
    total: number;
    dieSize: DieSize;
    target: number;
    outcome: ReturnType<typeof interpretOutcome>;
    critical: boolean;
    viaDicePlus: boolean;
  } | null>(null);

  const block = character.stats[stat];
  const dieSize = talent ? nextDie(block.dado) : block.dado;
  const count = Math.max(1, block.valor + extraDice);
  const target = BANDS.find((b) => b.letter === band)?.target ?? 9;
  const label = `${STATS_INFO.find((s) => s.key === stat)?.short ?? stat}${talent ? " +talento" : ""}`;

  const notation = useMemo(
    () =>
      buildAlborNotation({
        count,
        dieSize,
        label: `${character.nombre} ${label}`,
      }),
    [count, dieSize, character.nombre, label],
  );

  const perform = async () => {
    setBusy(true);
    setError(null);
    let faces: number[] = [];
    let viaDicePlus = false;

    try {
      if (dicePlusEnabled) {
        const ready = await isDicePlusReady();
        if (ready) {
          const result = await requestDicePlusRoll({ diceNotation: notation });
          faces = parseAlborDice(result);
          if (faces.length === 0 && result.result.totalValue) {
            faces = [result.result.totalValue];
          }
          viaDicePlus = true;
        }
      }
      if (faces.length === 0) {
        faces = Array.from({ length: count }, () => rollDie(dieSize));
      }
    } catch (err) {
      faces = Array.from({ length: count }, () => rollDie(dieSize));
      invalidateDicePlusReady();
      setError(err instanceof Error ? err.message : String(err));
    }

    const total = faces.reduce((sum, n) => sum + n, 0);
    const outcome = interpretOutcome(total, target);
    const critical = isCritical(faces, dieSize);
    setLast({ faces, total, dieSize, target, outcome, critical, viaDicePlus });
    onRolled({
      characterName: character.nombre || "Sin nombre",
      summary: `${label} ${count}d${dieSize} = ${total} vs ${band}(${target})${critical ? " CRÍTICO" : ""} → ${outcomeLabel(outcome)}`,
      total,
      critical,
      fumble: outcome === "fracaso",
      viaDicePlus,
    });
    setBusy(false);
  };

  return (
    <section className="panel roller">
      <h3>Tirador</h3>
      <div className="roller__row">
        {STATS_INFO.map((s) => (
          <button
            key={s.key}
            type="button"
            className={stat === s.key ? "is-active" : ""}
            onClick={() => setStat(s.key)}
          >
            {s.short} {character.stats[s.key].valor}d{character.stats[s.key].dado}
          </button>
        ))}
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={talent}
          onChange={(e) => setTalent(e.target.checked)}
        />
        Talento aplica (+1 escalón de dado)
      </label>
      <div className="field-row">
        <label>
          Dados extra
          <input
            type="number"
            value={extraDice}
            min={-3}
            max={6}
            onChange={(e) => setExtraDice(Number(e.target.value) || 0)}
          />
        </label>
        <label>
          Dificultad
          <select value={band} onChange={(e) => setBand(e.target.value)}>
            {BANDS.map((b) => (
              <option key={b.letter} value={b.letter}>
                {b.letter}({b.target})
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Vas a tirar <strong>{count}d{dieSize}</strong> vs {band}({target})
        {talent ? " (talento)" : ""}
        {dicePlusEnabled ? " · Dice+" : " · local"}
      </p>
      <button type="button" className="btn-primary" disabled={busy} onClick={() => void perform()}>
        {busy ? "Tirando…" : "Tirar"}
      </button>
      {error && <p className="warn">Dice+ falló, se usó tirada local. {error}</p>}
      {last && (
        <div className={`result result--${last.outcome}`}>
          <div className="result__faces">
            {last.faces.map((face, i) => (
              <span key={`${face}-${i}`}>d{last.dieSize}: {face}</span>
            ))}
          </div>
          <p>
            Total <strong>{last.total}</strong> vs {last.target} →{" "}
            <strong>{outcomeLabel(last.outcome)}</strong>
            {last.critical ? " · Crítico" : ""}
            {last.viaDicePlus ? " · Dice+" : ""}
          </p>
        </div>
      )}
      <p className="hint">
        Dados base: {DIE_SIZES.map((d) => `d${d}`).join(" → ")}. El talento sube un escalón.
      </p>
    </section>
  );
}
