import { useId } from "react";
import {
  BANDS,
  DIFFICULTY_DEFAULT,
  DIFFICULTY_MAX,
  DIFFICULTY_MIN,
  formatDifficulty,
} from "../types";

export function DifficultyStepper({
  value,
  onChange,
  allowNone,
  disabled,
  variant = "stacked",
  showScale,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  allowNone?: boolean;
  disabled?: boolean;
  /** "wide": ocupa todo el ancho (Tirador); "inline": etiqueta y leyenda en la misma fila (armas). */
  variant?: "stacked" | "wide" | "inline";
  /** Muestra la escala de bandas G(5)…S(19) debajo, con la actual resaltada. */
  showScale?: boolean;
}) {
  const labelId = useId();
  const parsed = value == null ? null : Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, value));
  const atMin = parsed != null && parsed <= DIFFICULTY_MIN;
  const atMax = parsed != null && parsed >= DIFFICULTY_MAX;

  const setNumber = (raw: number) => {
    if (!Number.isFinite(raw)) {
      if (allowNone) onChange(null);
      return;
    }
    onChange(Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, Math.round(raw))));
  };

  const hint =
    parsed != null ? formatDifficulty(parsed) : allowNone ? "(solo total)" : null;

  return (
    <div className={`stepper-field stepper-field--${variant}`}>
      <span id={labelId} className="stepper-field__label">
        Dificultad
      </span>
      <span className="stepper" role="group" aria-labelledby={labelId}>
        <button
          type="button"
          aria-label="Bajar dificultad"
          disabled={disabled || (parsed == null && allowNone) || (!allowNone && atMin)}
          onClick={() => {
            if (parsed == null) return;
            if (allowNone && atMin) onChange(null);
            else setNumber(parsed - 1);
          }}
        >
          −
        </button>
        <input
          type="number"
          min={DIFFICULTY_MIN}
          max={DIFFICULTY_MAX}
          disabled={disabled}
          aria-labelledby={labelId}
          value={parsed ?? ""}
          placeholder={allowNone ? "—" : String(DIFFICULTY_DEFAULT)}
          onChange={(e) => {
            if (e.target.value === "") {
              if (allowNone) onChange(null);
              return;
            }
            setNumber(Number(e.target.value));
          }}
        />
        <button
          type="button"
          aria-label="Subir dificultad"
          disabled={disabled || atMax}
          onClick={() =>
            setNumber(parsed == null ? DIFFICULTY_DEFAULT : parsed + 1)
          }
        >
          +
        </button>
      </span>
      {hint && <span className="stepper__hint">{hint}</span>}
      {showScale && (
        <span className="stepper__scale" aria-hidden="true">
          {BANDS.map((b) => (
            <span key={b.letter} className={b.target === parsed ? "is-current" : undefined}>
              {b.letter}({b.target})
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
