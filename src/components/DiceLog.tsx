import { formatFaceList, type DiceRollLogEntry, type Outcome } from "../types";
import { AlborSun } from "./AlborSun";

const OUTCOME_SUFFIXES: [string, Outcome][] = [
  ["→ Éxito extra", "extra"],
  ["→ Éxito limitado", "limitado"],
  ["→ Fracaso", "fracaso"],
  ["→ Éxito", "exito"],
];

function entryTone(entry: DiceRollLogEntry): Outcome | "critical" | null {
  if (entry.critical) return "critical";
  const found = OUTCOME_SUFFIXES.find(([text]) => entry.summary.includes(text));
  if (found) return found[1];
  return entry.fumble ? "fracaso" : null;
}

export function DiceLog({
  entries,
  canClear,
  onClear,
}: {
  entries: DiceRollLogEntry[];
  canClear?: boolean;
  onClear?: () => void;
}) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h3>- Tiradas -</h3>
        {canClear && (
          <button type="button" className="btn-danger" disabled={entries.length === 0} onClick={onClear}>
            Vaciar
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <div className="empty-state empty-state--inline">
          <AlborSun size={72} variant="line" />
          <p>Todavía no hay tiradas.</p>
        </div>
      ) : (
        <ul className="log">
          {entries.map((e) => {
            const tone = entryTone(e);
            return (
              <li key={e.id} className={tone ? `log__entry log__entry--${tone}` : "log__entry"}>
                <span className="log__who">
                  {e.characterName}
                  {e.playerName ? ` (${e.playerName})` : ""}
                </span>
                <span className="log__summary">{e.summary}</span>
                {e.faces && e.faces.length > 0 && (
                  <span className="result__faces log__faces">
                    {e.faces.map((face, i) => (
                      <span key={`${e.id}-${i}`} className="die-face die-face--sm">
                        <em>{e.dieSize ? `d${e.dieSize}` : `dado ${i + 1}`}</em>
                        <strong>{face}</strong>
                      </span>
                    ))}
                    <span className="log__sum">
                      {formatFaceList(e.faces)} = {e.total}
                    </span>
                  </span>
                )}
                <span className="log__meta">
                  {new Date(e.timestamp).toLocaleTimeString()}
                  {e.viaDicePlus ? " · Dice+" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
