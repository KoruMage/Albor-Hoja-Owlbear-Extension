import { formatFaceList, interpretOutcome, outcomeLabel, type DieSize } from "../types";

export function DiceResultView({
  faces,
  dieSize,
  total,
  target,
  critical,
  viaDicePlus,
  className,
}: {
  faces: number[];
  dieSize: DieSize;
  total: number;
  target?: number | null;
  critical: boolean;
  viaDicePlus: boolean;
  className?: string;
}) {
  const outcome = target != null ? interpretOutcome(total, target) : null;
  const classes = ["result"];
  if (outcome) classes.push(`result--${outcome}`);
  if (critical) classes.push("result--critical");
  if (className) classes.push(className);

  return (
    <div className={classes.join(" ")}>
      {critical && (
        <span className="result__seal" aria-hidden="true">
          Crítico
        </span>
      )}
      <div className="result__faces" aria-label="Resultado de cada dado">
        {faces.map((face, i) => (
          <span key={`${face}-${i}`} className="die-face">
            <em>dado {i + 1}</em>
            <strong>{face}</strong>
            <small>d{dieSize}</small>
          </span>
        ))}
      </div>
      <p className="result__line">
        {faces.length > 0 ? (
          <>
            {formatFaceList(faces)} = <strong className="result__total">{total}</strong>
          </>
        ) : (
          <>
            Total <strong className="result__total">{total}</strong>
          </>
        )}
        {target != null && outcome && (
          <>
            {" "}
            vs {target} → <strong className="result__outcome">{outcomeLabel(outcome)}</strong>
          </>
        )}
        {critical && <span className="result__crit"> · Crítico</span>}
        {viaDicePlus ? " · Dice+" : ""}
      </p>
    </div>
  );
}
