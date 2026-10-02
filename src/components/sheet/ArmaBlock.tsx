import { useState } from "react";
import {
  AlborCharacter,
  Arma,
  DIE_SIZES,
  DieSize,
  STATS_INFO,
  StatKey,
  formatDifficulty,
  formatFaceList,
  interpretOutcome,
  isCritical,
  outcomeLabel,
} from "../../types";
import { performAlborRoll } from "../../utils/performRoll";
import { DiceResultView } from "../DiceResultView";
import type { DiceRollSummary } from "../DiceRoller";
import { DifficultyStepper } from "../DifficultyStepper";
import { TextField } from "./fields";

export function ArmaBlock({
  item,
  character,
  readOnly,
  dicePlusEnabled,
  onPatch,
  onRolled,
}: {
  item: Arma;
  character: AlborCharacter;
  readOnly?: boolean;
  dicePlusEnabled: boolean;
  onPatch: (id: string, next: Partial<Arma>) => void;
  onRolled?: (payload: DiceRollSummary & { characterName: string }) => void;
}) {
  const [momentum, setMomentum] = useState(1);
  const [target, setTarget] = useState(9);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{
    faces: number[];
    total: number;
    dieSize: DieSize;
    target: number;
    critical: boolean;
    viaDicePlus: boolean;
  } | null>(null);

  const statValor = character.stats[item.stat].valor;
  const maxDice = Math.max(1, statValor);
  const momentumMax = Math.max(0, maxDice - 1);
  const extra = Math.min(momentumMax, Math.max(0, momentum));
  const count = Math.min(maxDice, Math.max(1, 1 + extra));
  const dieSize = item.dado;
  const named = item.nombre.trim();
  const canRoll = Boolean(!readOnly && onRolled && named);
  const statShort = STATS_INFO.find((s) => s.key === item.stat)?.short ?? item.stat.toUpperCase();
  const label = named || "Arma";

  const perform = async () => {
    if (!onRolled || !named) return;
    setBusy(true);
    setError(null);
    const rolled = await performAlborRoll({
      count,
      dieSize,
      label: `${character.nombre} ${label} ${statShort}${extra ? ` +${extra} mom` : ""}`,
      dicePlusEnabled,
    });
    const faces = rolled.faces;
    const total = faces.reduce((sum, n) => sum + n, 0);
    const outcome = interpretOutcome(total, target);
    const critical = isCritical(faces, dieSize);
    setLast({ faces, total, dieSize, target, critical, viaDicePlus: rolled.viaDicePlus });
    setError(rolled.error);
    onRolled({
      characterName: character.nombre || "Sin nombre",
      summary: `${label} ${statShort}${extra ? `+${extra} mom` : ""} ${count}d${dieSize} [${formatFaceList(faces)}] = ${total} vs ${formatDifficulty(target)}${critical ? " CRÍTICO" : ""} → ${outcomeLabel(outcome)}`,
      total,
      faces,
      dieSize,
      critical,
      fumble: outcome === "fracaso",
      viaDicePlus: rolled.viaDicePlus,
    });
    setBusy(false);
  };

  const rollable = !readOnly && onRolled;
  const classes = ["arma"];
  if (!named) classes.push("arma--empty");
  if (readOnly) classes.push("arma--read");

  return (
    <div className={classes.join(" ")}>
      <div className="arma__row">
        <TextField
          className="arma__name"
          placeholder="Arma o armadura"
          ariaLabel="Arma o armadura"
          value={item.nombre}
          readOnly={readOnly}
          onChange={(nombre) => onPatch(item.id, { nombre })}
        />
        <TextField
          className="arma__notes"
          placeholder="notas"
          ariaLabel="Notas del arma"
          value={item.descripcion}
          readOnly={readOnly}
          onChange={(descripcion) => onPatch(item.id, { descripcion })}
        />
      </div>
      {readOnly ? (
        named && (
          <p className="arma__read-stats">
            <span>
              <em>Estadística</em> {statShort} ({statValor})
            </span>
            <span>
              <em>Dado</em> d{dieSize}
            </span>
            <span className="arma__preview">
              1d{dieSize} + momentum (máx. {statShort} {maxDice})
            </span>
          </p>
        )
      ) : (
        <div className="arma__roll">
          <label className="inline-field">
            Estadística
            <select
              value={item.stat}
              onChange={(e) => onPatch(item.id, { stat: e.target.value as StatKey })}
            >
              {STATS_INFO.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.short} ({character.stats[s.key].valor})
                </option>
              ))}
            </select>
          </label>
          <label className="inline-field">
            Dado
            <select
              value={item.dado}
              onChange={(e) => onPatch(item.id, { dado: Number(e.target.value) as DieSize })}
            >
              {DIE_SIZES.map((size) => (
                <option key={size} value={size}>
                  d{size}
                </option>
              ))}
            </select>
          </label>
          {rollable && (
            <>
              <label className="inline-field">
                Momentum
                <input
                  type="number"
                  min={0}
                  max={momentumMax}
                  value={extra}
                  onChange={(e) =>
                    setMomentum(Math.min(momentumMax, Math.max(0, Number(e.target.value) || 0)))
                  }
                />
              </label>
              <DifficultyStepper
                variant="inline"
                value={target}
                onChange={(n) => n != null && setTarget(n)}
              />
              <button
                type="button"
                className="btn-primary arma__roll-btn"
                disabled={busy || !canRoll}
                onClick={() => void perform()}
              >
                {busy ? "Tirando…" : `Tirar ${count}d${dieSize}`}
              </button>
            </>
          )}
        </div>
      )}
      {rollable && (
        <p className="arma__preview">
          {named
            ? `1d${dieSize}${extra ? ` + ${extra} momentum` : ""} → ${count}d${dieSize} (máx. ${statShort} ${maxDice})`
            : "Ponle nombre al arma para tirar."}
        </p>
      )}
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
    </div>
  );
}
