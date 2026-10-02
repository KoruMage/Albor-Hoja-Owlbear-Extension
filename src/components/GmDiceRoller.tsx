import { useState } from "react";
import {
  BANDS,
  DIE_SIZES,
  DieSize,
  formatDifficulty,
  formatFaceList,
  interpretOutcome,
  isCritical,
  outcomeLabel,
} from "../types";
import { performAlborRoll } from "../utils/performRoll";
import { DiceResultView } from "./DiceResultView";
import { DifficultyStepper } from "./DifficultyStepper";
import type { DiceRollSummary } from "./DiceRoller";

export function GmDiceRoller({
  dicePlusEnabled,
  directorName,
  onRolled,
}: {
  dicePlusEnabled: boolean;
  directorName: string;
  onRolled: (payload: DiceRollSummary & { characterName: string }) => void;
}) {
  const [label, setLabel] = useState("");
  const [count, setCount] = useState(2);
  const [dieSize, setDieSize] = useState<DieSize>(6);
  const [target, setTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{
    faces: number[];
    total: number;
    dieSize: DieSize;
    target: number | null;
    critical: boolean;
    viaDicePlus: boolean;
  } | null>(null);

  const diceCount = Math.max(1, Math.min(12, count));
  const who = label.trim() || directorName.trim() || "Director";

  const perform = async () => {
    setBusy(true);
    setError(null);
    const rolled = await performAlborRoll({
      count: diceCount,
      dieSize,
      label: `${who} ${diceCount}d${dieSize}`,
      dicePlusEnabled,
    });
    const faces = rolled.faces;
    const total = faces.reduce((sum, n) => sum + n, 0);
    const critical = isCritical(faces, dieSize);
    const outcome = target != null ? interpretOutcome(total, target) : null;
    setLast({
      faces,
      total,
      dieSize,
      target,
      critical,
      viaDicePlus: rolled.viaDicePlus,
    });
    setError(rolled.error);
    const vs =
      target != null && outcome
        ? ` vs ${formatDifficulty(target)} → ${outcomeLabel(outcome)}`
        : "";
    onRolled({
      characterName: who,
      summary: `${diceCount}d${dieSize} [${formatFaceList(faces)}] = ${total}${vs}${critical ? " CRÍTICO" : ""}`,
      total,
      faces,
      dieSize,
      critical,
      fumble: outcome === "fracaso",
      viaDicePlus: rolled.viaDicePlus,
    });
    setBusy(false);
  };

  return (
    <div className="gm-roller">
      <section className="panel roller gm-roller__main">
        <h3>- Tirador del Director -</h3>
        <p className="muted">
          Tiradas libres para PNJ, trampas, daño o checks sin ficha.
          {dicePlusEnabled ? " · Dice+" : " · local"}
        </p>
        <label>
          Quién tira
          <input
            value={label}
            placeholder={directorName || "Director"}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <div className="field-row">
          <label>
            Cantidad
            <input
              type="number"
              min={1}
              max={12}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
            />
          </label>
          <label>
            Dado
            <select
              value={dieSize}
              onChange={(e) => setDieSize(Number(e.target.value) as DieSize)}
            >
              {DIE_SIZES.map((size) => (
                <option key={size} value={size}>
                  d{size}
                </option>
              ))}
            </select>
          </label>
          <DifficultyStepper allowNone value={target} onChange={setTarget} />
        </div>
        <p className="muted">
          Vas a tirar <strong>{diceCount}d{dieSize}</strong>
          {target != null ? ` vs ${formatDifficulty(target)}` : " (solo total)"}
        </p>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void perform()}>
          {busy ? "Tirando…" : "Tirar"}
        </button>
        {error && <p className="warn">Dice+ falló, se usó tirada local. {error}</p>}
        {last && (
          <DiceResultView
            faces={last.faces}
            dieSize={last.dieSize}
            total={last.total}
            target={last.target}
            critical={last.critical}
            viaDicePlus={last.viaDicePlus}
          />
        )}
      </section>
      <aside className="panel gm-ref" aria-label="Referencia rápida">
        <h3>- Referencia -</h3>
        <h4 className="gm-ref__heading">Bandas de dificultad</h4>
        <ul className="gm-ref__bands">
          {BANDS.map((b) => (
            <li key={b.letter} className={b.target === target ? "is-active" : undefined}>
              <strong>{b.letter}</strong>
              <span>{b.target}</span>
            </li>
          ))}
        </ul>
        <h4 className="gm-ref__heading">Resultados</h4>
        <dl className="gm-ref__outcomes">
          <div className="gm-ref__outcome gm-ref__outcome--extra">
            <dt>{outcomeLabel("extra")}</dt>
            <dd>más de 5 por encima</dd>
          </div>
          <div className="gm-ref__outcome gm-ref__outcome--exito">
            <dt>{outcomeLabel("exito")}</dt>
            <dd>de 0 a 5 por encima</dd>
          </div>
          <div className="gm-ref__outcome gm-ref__outcome--limitado">
            <dt>{outcomeLabel("limitado")}</dt>
            <dd>de 1 a 2 por debajo</dd>
          </div>
          <div className="gm-ref__outcome gm-ref__outcome--fracaso">
            <dt>{outcomeLabel("fracaso")}</dt>
            <dd>peor que eso</dd>
          </div>
        </dl>
        <div className="gm-ref__crit">
          <h4 className="gm-ref__heading">Crítico</h4>
          <p>Tres o más dados d6 o mayores, con al menos tres caras pares ≥ 6.</p>
        </div>
      </aside>
    </div>
  );
}
