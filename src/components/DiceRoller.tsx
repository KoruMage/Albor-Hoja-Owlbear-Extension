import { useId, useState } from "react";
import {
  AlborCharacter,
  DIE_SIZES,
  DieSize,
  STATS_INFO,
  StatKey,
  formatDifficulty,
  formatFaceList,
  interpretOutcome,
  isCritical,
  nextDie,
  outcomeLabel,
} from "../types";
import { performAlborRoll } from "../utils/performRoll";
import { DiceResultView } from "./DiceResultView";
import { DifficultyStepper } from "./DifficultyStepper";

export interface DiceRollSummary {
  summary: string;
  total: number;
  faces: number[];
  dieSize: DieSize;
  critical: boolean;
  fumble: boolean;
  viaDicePlus: boolean;
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
  const bodyId = useId();
  const [open, setOpen] = useState(true);
  const [stat, setStat] = useState<StatKey>("vig");
  const [talent, setTalent] = useState(false);
  const [extraDice, setExtraDice] = useState(0);
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

  const block = character.stats[stat];
  const dieSize = talent ? nextDie(block.dado) : block.dado;
  const count = Math.max(1, block.valor + extraDice);
  const label = `${STATS_INFO.find((s) => s.key === stat)?.short ?? stat}${talent ? " +talento" : ""}`;

  const perform = async () => {
    setBusy(true);
    setError(null);
    const rolled = await performAlborRoll({
      count,
      dieSize,
      label: `${character.nombre} ${label}`,
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
      summary: `${label} ${count}d${dieSize} [${formatFaceList(faces)}] = ${total} vs ${formatDifficulty(target)}${critical ? " CRÍTICO" : ""} → ${outcomeLabel(outcome)}`,
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
    <section className={open ? "panel tirador" : "panel tirador is-collapsed"}>
      <h3 className="tirador__head">
        <button
          type="button"
          className="tirador__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="tirador__title">- Tirador -</span>
          {!open && (
            <span className="tirador__peek">
              {label} · {count}d{dieSize} vs {formatDifficulty(target)}
            </span>
          )}
          <span className="tirador__action">{open ? "[ Colapsar ]" : "[ Expandir ]"}</span>
        </button>
      </h3>
      <div id={bodyId} className="tirador__body" hidden={!open}>
        <div className="tirador__grid">
          <div className="tirador__main">
            <div className="tirador__chips">
              {STATS_INFO.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={stat === s.key}
                  className={stat === s.key ? "is-active" : ""}
                  onClick={() => setStat(s.key)}
                >
                  {s.short}{" "}
                  <strong>
                    {character.stats[s.key].valor}d{character.stats[s.key].dado}
                  </strong>
                </button>
              ))}
            </div>
            <div className="tirador__mods">
              <label className="check">
                <input
                  type="checkbox"
                  checked={talent}
                  onChange={(e) => setTalent(e.target.checked)}
                />
                Talento aplica (+1 escalón de dado)
              </label>
              <label className="inline-field">
                Dados extra
                <input
                  type="number"
                  value={extraDice}
                  min={-3}
                  max={6}
                  onChange={(e) => setExtraDice(Number(e.target.value) || 0)}
                />
              </label>
            </div>
            <div className="tirador__go">
              <p className="tirador__summary">
                Vas a tirar{" "}
                <strong>
                  {count}d{dieSize} vs {formatDifficulty(target)}
                </strong>
                {talent ? " (talento)" : ""}
                {dicePlusEnabled ? " · Dice+" : " · local"}
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => void perform()}
              >
                {busy ? "Tirando…" : "Tirar"}
              </button>
            </div>
          </div>
          <div className="tirador__difficulty">
            <DifficultyStepper
              variant="wide"
              showScale
              value={target}
              onChange={(n) => n != null && setTarget(n)}
            />
          </div>
        </div>
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
        <p className="tirador__help">
          Dados base: {DIE_SIZES.map((d) => `d${d}`).join(" → ")}. El talento sube un escalón.
        </p>
      </div>
    </section>
  );
}
