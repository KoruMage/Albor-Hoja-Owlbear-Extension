import { formatFaceList, type DiceRollLogEntry } from "../types";

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
        <h3>Tiradas</h3>
        {canClear && (
          <button type="button" onClick={onClear}>
            Vaciar
          </button>
        )}
      </div>
      {entries.length === 0 && <p className="muted">Todavía no hay tiradas.</p>}
      <ul className="log">
        {entries.map((e) => (
          <li key={e.id} className={e.critical ? "is-crit" : e.fumble ? "is-fail" : ""}>
            <span className="log__who">
              {e.characterName}
              {e.playerName ? ` (${e.playerName})` : ""}
            </span>
            <span>{e.summary}</span>
            {e.faces && e.faces.length > 0 && (
              <span className="result__faces log__faces">
                {e.faces.map((face, i) => (
                  <span key={`${e.id}-${i}`} className="die-face die-face--sm">
                    <em>{e.dieSize ? `d${e.dieSize}` : `dado ${i + 1}`}</em>
                    <strong>{face}</strong>
                  </span>
                ))}
                <span className="muted">
                  {formatFaceList(e.faces)} = {e.total}
                </span>
              </span>
            )}
            <span className="muted">
              {new Date(e.timestamp).toLocaleTimeString()}
              {e.viaDicePlus ? " · Dice+" : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
