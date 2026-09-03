import type { Player } from "@owlbear-rodeo/sdk";
import {
  AlborCharacter,
  DIE_SIZES,
  DieSize,
  STATS_INFO,
  StatKey,
  Talento,
  defaultChispaMax,
  defaultDetMax,
  newId,
} from "../types";
import { DiceRoller, type DiceRollSummary } from "./DiceRoller";

function num(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function CharacterSheet({
  character,
  readOnly,
  isGM,
  players,
  dicePlusEnabled,
  onChange,
  onAssign,
  onRolled,
}: {
  character: AlborCharacter;
  readOnly?: boolean;
  isGM?: boolean;
  players?: Player[];
  dicePlusEnabled: boolean;
  onChange?: (next: AlborCharacter) => void;
  onAssign?: (ownerId: string | null) => void;
  onRolled?: (payload: DiceRollSummary & { characterName: string }) => void;
}) {
  const patch = (partial: Partial<AlborCharacter>) => {
    if (!onChange || readOnly) return;
    onChange({ ...character, ...partial });
  };

  const patchStat = (key: StatKey, field: "valor" | "dado", value: number) => {
    const stats = {
      ...character.stats,
      [key]: { ...character.stats[key], [field]: value },
    };
    const detMax = defaultDetMax(stats.vig.valor, stats.vol.valor);
    const chispaMax = defaultChispaMax(stats.apt.valor, stats.vol.valor);
    const prevDetMax = defaultDetMax(character.stats.vig.valor, character.stats.vol.valor);
    const prevChispaMax = defaultChispaMax(character.stats.apt.valor, character.stats.vol.valor);
    const prevMov = character.stats.agi.valor * 2;
    const nextDetMax = character.det.max === prevDetMax ? detMax : character.det.max;
    const nextChispaMax =
      character.chispa.max === prevChispaMax ? chispaMax : character.chispa.max;
    patch({
      stats,
      det: { max: nextDetMax, actual: Math.min(character.det.actual, nextDetMax) },
      chispa: {
        max: nextChispaMax,
        actual: Math.min(character.chispa.actual, nextChispaMax),
      },
      reservaDet:
        character.reservaDet === prevDetMax * 2 ? detMax * 2 : character.reservaDet,
      reservaChispa:
        character.reservaChispa === prevChispaMax * 2
          ? chispaMax * 2
          : character.reservaChispa,
      adrenalina:
        character.adrenalina === `1d4+${character.stats.vig.valor}`
          ? `1d4+${stats.vig.valor}`
          : character.adrenalina,
      mov: character.mov === prevMov ? stats.agi.valor * 2 : character.mov,
    });
  };

  const patchTalento = (id: string, next: Partial<Talento>) => {
    patch({
      talentos: character.talentos.map((t) => (t.id === id ? { ...t, ...next } : t)),
    });
  };

  return (
    <div className="sheet">
      <section className="panel">
        <h3>Identidad</h3>
        <div className="grid-2">
          <label>
            Nombre
            <input
              value={character.nombre}
              disabled={readOnly}
              onChange={(e) => patch({ nombre: e.target.value })}
            />
          </label>
          <label>
            Concepto
            <input
              value={character.concepto}
              disabled={readOnly}
              onChange={(e) => patch({ concepto: e.target.value })}
            />
          </label>
          <label>
            Linaje
            <input
              value={character.linaje}
              disabled={readOnly}
              onChange={(e) => patch({ linaje: e.target.value })}
            />
          </label>
          <label>
            Ocupación
            <input
              value={character.ocupacion}
              disabled={readOnly}
              onChange={(e) => patch({ ocupacion: e.target.value })}
            />
          </label>
          <label>
            Rol / clase
            <input
              value={character.rol}
              disabled={readOnly}
              onChange={(e) => patch({ rol: e.target.value })}
            />
          </label>
          <label>
            Nivel
            <input
              type="number"
              min={1}
              value={character.nivel}
              disabled={readOnly}
              onChange={(e) => patch({ nivel: num(e.target.value, 1) })}
            />
          </label>
          <label>
            Tamaño
            <input
              value={character.tamano}
              disabled={readOnly}
              onChange={(e) => patch({ tamano: e.target.value })}
            />
          </label>
          {isGM && onAssign && (
            <label>
              Asignado a
              <select
                value={character.ownerId ?? ""}
                onChange={(e) => onAssign(e.target.value || null)}
              >
                <option value="">Sin asignar</option>
                {(players ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="panel">
        <h3>Estadísticas</h3>
        <div className="stats">
          {STATS_INFO.map((s) => (
            <div key={s.key} className="stat">
              <strong>{s.short}</strong>
              <label>
                Dados
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={character.stats[s.key].valor}
                  disabled={readOnly}
                  onChange={(e) => patchStat(s.key, "valor", num(e.target.value, 1))}
                />
              </label>
              <label>
                Dado base
                <select
                  value={character.stats[s.key].dado}
                  disabled={readOnly}
                  onChange={(e) =>
                    patchStat(s.key, "dado", Number(e.target.value) as DieSize)
                  }
                >
                  {DIE_SIZES.map((d) => (
                    <option key={d} value={d}>
                      d{d}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Recursos</h3>
        <div className="grid-3">
          <ResourcePair
            label="DET"
            actual={character.det.actual}
            max={character.det.max}
            readOnly={readOnly}
            onActual={(n) => patch({ det: { ...character.det, actual: n } })}
            onMax={(n) =>
              patch({ det: { actual: Math.min(character.det.actual, n), max: n } })
            }
          />
          <label>
            Reserva DET
            <input
              type="number"
              value={character.reservaDet}
              disabled={readOnly}
              onChange={(e) => patch({ reservaDet: num(e.target.value, 0) })}
            />
          </label>
          <ResourcePair
            label="Chispa"
            actual={character.chispa.actual}
            max={character.chispa.max}
            readOnly={readOnly}
            onActual={(n) => patch({ chispa: { ...character.chispa, actual: n } })}
            onMax={(n) =>
              patch({ chispa: { actual: Math.min(character.chispa.actual, n), max: n } })
            }
          />
          <label>
            Reserva Chispa
            <input
              type="number"
              value={character.reservaChispa}
              disabled={readOnly}
              onChange={(e) => patch({ reservaChispa: num(e.target.value, 0) })}
            />
          </label>
          <ResourcePair
            label="Suerte"
            actual={character.suerte.actual}
            max={character.suerte.max}
            readOnly={readOnly}
            onActual={(n) => patch({ suerte: { ...character.suerte, actual: n } })}
            onMax={(n) =>
              patch({ suerte: { actual: Math.min(character.suerte.actual, n), max: n } })
            }
          />
          <ResourcePair
            label="Heridas"
            actual={character.heridas.actual}
            max={character.heridas.max}
            readOnly={readOnly}
            onActual={(n) => patch({ heridas: { ...character.heridas, actual: n } })}
            onMax={(n) =>
              patch({ heridas: { actual: Math.min(character.heridas.actual, n), max: n } })
            }
          />
          <label>
            MOV
            <input
              type="number"
              value={character.mov}
              disabled={readOnly}
              onChange={(e) => patch({ mov: num(e.target.value, 0) })}
            />
          </label>
          <label>
            DP
            <input
              type="number"
              value={character.dp}
              disabled={readOnly}
              onChange={(e) => patch({ dp: num(e.target.value, 0) })}
            />
          </label>
          <label>
            Adrenalina
            <input
              value={character.adrenalina}
              disabled={readOnly}
              onChange={(e) => patch({ adrenalina: e.target.value })}
            />
          </label>
        </div>
        <p className="hint">
          DET = (VIG+VOL)×2 · Chispa = (APT+VOL)×2 · Reservas = máximo×2 · MOV por defecto AGI×2
        </p>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h3>Talentos</h3>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                patch({
                  talentos: [
                    ...character.talentos,
                    { id: newId(), nombre: "", descripcion: "" },
                  ],
                })
              }
            >
              Añadir
            </button>
          )}
        </div>
        {character.talentos.length === 0 && <p className="muted">Sin talentos aún.</p>}
        {character.talentos.map((t) => (
          <div key={t.id} className="talento">
            <input
              placeholder="Nombre"
              value={t.nombre}
              disabled={readOnly}
              onChange={(e) => patchTalento(t.id, { nombre: e.target.value })}
            />
            <textarea
              placeholder="Qué hace o qué tirada mejora"
              value={t.descripcion}
              disabled={readOnly}
              onChange={(e) => patchTalento(t.id, { descripcion: e.target.value })}
            />
            {!readOnly && (
              <button
                type="button"
                className="btn-danger"
                onClick={() =>
                  patch({ talentos: character.talentos.filter((x) => x.id !== t.id) })
                }
              >
                Quitar
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="panel">
        <h3>Notas</h3>
        <textarea
          className="notes"
          value={character.notas}
          disabled={readOnly}
          onChange={(e) => patch({ notas: e.target.value })}
        />
      </section>

      {!readOnly && onRolled && (
        <DiceRoller
          character={character}
          dicePlusEnabled={dicePlusEnabled}
          onRolled={onRolled}
        />
      )}
    </div>
  );
}

function ResourcePair({
  label,
  actual,
  max,
  readOnly,
  onActual,
  onMax,
}: {
  label: string;
  actual: number;
  max: number;
  readOnly?: boolean;
  onActual: (n: number) => void;
  onMax: (n: number) => void;
}) {
  return (
    <label>
      {label}
      <span className="resource">
        <input
          type="number"
          value={actual}
          disabled={readOnly}
          onChange={(e) => onActual(num(e.target.value, 0))}
        />
        <span>/</span>
        <input
          type="number"
          value={max}
          disabled={readOnly}
          onChange={(e) => onMax(num(e.target.value, 0))}
        />
      </span>
    </label>
  );
}
