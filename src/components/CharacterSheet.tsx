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

  const patchNamed = (
    key: "lazos" | "maestrias" | "armas",
    id: string,
    next: Partial<Talento>,
  ) => {
    patch({
      [key]: character[key].map((item) => (item.id === id ? { ...item, ...next } : item)),
    });
  };

  const patchLine = (key: "etiquetas" | "equipo" | "dominio", index: number, value: string) => {
    const next = [...character[key]];
    next[index] = value;
    patch({ [key]: next });
  };

  return (
    <>
      {!readOnly && onRolled && (
        <DiceRoller
          character={character}
          dicePlusEnabled={dicePlusEnabled}
          onRolled={onRolled}
        />
      )}
      <div className="sheet">
      <p className="wordmark">~ ~ ~ albor ~ ~ juego ~ de ~ rol ~ ~ ~</p>

      <label className="field-center">
        Nombre del Personaje
        <input
          value={character.nombre}
          disabled={readOnly}
          onChange={(e) => patch({ nombre: e.target.value })}
        />
      </label>

      <label className="field-full">
        Concepto del personaje
        <input
          value={character.concepto}
          disabled={readOnly}
          onChange={(e) => patch({ concepto: e.target.value })}
        />
      </label>

      <div className="id-row">
        <label>
          Linaje
          <input
            value={character.linaje}
            disabled={readOnly}
            onChange={(e) => patch({ linaje: e.target.value })}
          />
        </label>
        <label>
          Ocupación (o Gremio)
          <input
            value={character.ocupacion}
            disabled={readOnly}
            onChange={(e) => patch({ ocupacion: e.target.value })}
          />
        </label>
        <label>
          Rol
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

      <div className="attr-bar">
        {STATS_INFO.map((s) => (
          <div key={s.key} className="stat-block">
            <div className="stat-tab">
              <strong>{s.label.toUpperCase()}</strong>
              <input
                type="number"
                min={1}
                max={8}
                value={character.stats[s.key].valor}
                disabled={readOnly}
                onChange={(e) => patchStat(s.key, "valor", num(e.target.value, 1))}
                aria-label={`${s.label} dados`}
              />
            </div>
            <div className="dado-banner">
              dado base
              <select
                value={character.stats[s.key].dado}
                disabled={readOnly}
                onChange={(e) =>
                  patchStat(s.key, "dado", Number(e.target.value) as DieSize)
                }
                aria-label={`${s.label} dado base`}
              >
                {DIE_SIZES.map((d) => (
                  <option key={d} value={d}>
                    d{d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="resource-board">
        <ResourceBox
          title="Determinación"
          leftLabel="actual"
          rightLabel="Máxima"
          actual={character.det.actual}
          max={character.det.max}
          extraLabel="Reserva"
          extra={character.reservaDet}
          readOnly={readOnly}
          onActual={(n) => patch({ det: { ...character.det, actual: n } })}
          onMax={(n) =>
            patch({ det: { actual: Math.min(character.det.actual, n), max: n } })
          }
          onExtra={(n) => patch({ reservaDet: n })}
        />
        <ResourceBox
          title="Chispa"
          leftLabel="actual"
          rightLabel="Máxima"
          actual={character.chispa.actual}
          max={character.chispa.max}
          extraLabel="Reserva"
          extra={character.reservaChispa}
          readOnly={readOnly}
          onActual={(n) => patch({ chispa: { ...character.chispa, actual: n } })}
          onMax={(n) =>
            patch({ chispa: { actual: Math.min(character.chispa.actual, n), max: n } })
          }
          onExtra={(n) => patch({ reservaChispa: n })}
        />
        <ResourceBox
          title="Suerte"
          leftLabel="Restante"
          rightLabel="Total"
          actual={character.suerte.actual}
          max={character.suerte.max}
          readOnly={readOnly}
          onActual={(n) => patch({ suerte: { ...character.suerte, actual: n } })}
          onMax={(n) =>
            patch({ suerte: { actual: Math.min(character.suerte.actual, n), max: n } })
          }
        />
      </div>

      <div className="resource-board resource-board--secondary">
        <ResourceBox
          title="Heridas"
          leftLabel="actuales"
          rightLabel="Capacidad"
          actual={character.heridas.actual}
          max={character.heridas.max}
          readOnly={readOnly}
          onActual={(n) => patch({ heridas: { ...character.heridas, actual: n } })}
          onMax={(n) =>
            patch({ heridas: { actual: Math.min(character.heridas.actual, n), max: n } })
          }
        />
        <label className="resource-box">
          <h4>Movimiento</h4>
          <input
            type="number"
            value={character.mov}
            disabled={readOnly}
            onChange={(e) => patch({ mov: num(e.target.value, 0) })}
          />
        </label>
        <label className="resource-box">
          <h4>Adrenalina (+VIG)</h4>
          <input
            value={character.adrenalina}
            disabled={readOnly}
            onChange={(e) => patch({ adrenalina: e.target.value })}
          />
        </label>
        <label className="resource-box">
          <h4>DP</h4>
          <input
            type="number"
            value={character.dp}
            disabled={readOnly}
            onChange={(e) => patch({ dp: num(e.target.value, 0) })}
          />
        </label>
      </div>

      <section className="talentos">
        <div className="panel__head">
          <h3 className="section-title">- Talentos -</h3>
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
              placeholder="descripción"
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

      <section>
        <h3 className="section-title">Notas</h3>
        <textarea
          className="notes"
          value={character.notas}
          disabled={readOnly}
          onChange={(e) => patch({ notas: e.target.value })}
        />
      </section>
      </div>

      <div className="sheet">
        <p className="wordmark">~ ~ ~ albor ~ ~ juego ~ de ~ rol ~ ~ ~</p>
        <label className="field-center">
          Nombre del Personaje
          <input
            value={character.nombre}
            disabled={readOnly}
            onChange={(e) => patch({ nombre: e.target.value })}
          />
        </label>

        <section>
          <div className="panel__head">
            <h3 className="section-title">- Lazos -</h3>
            <span className="muted">notas</span>
          </div>
          {character.lazos.map((item) => (
            <div key={item.id} className="talento talento--pair">
              <input
                placeholder="Lazo"
                value={item.nombre}
                disabled={readOnly}
                onChange={(e) => patchNamed("lazos", item.id, { nombre: e.target.value })}
              />
              <input
                placeholder="notas"
                value={item.descripcion}
                disabled={readOnly}
                onChange={(e) =>
                  patchNamed("lazos", item.id, { descripcion: e.target.value })
                }
              />
            </div>
          ))}
        </section>

        <div className="page2-mid">
          <div>
            <h3 className="section-title">- Etiquetas -</h3>
            <div className="tag-grid">
              {character.etiquetas.map((etiqueta, index) => (
                <input
                  key={`etq-${index}`}
                  value={etiqueta}
                  disabled={readOnly}
                  onChange={(e) => patchLine("etiquetas", index, e.target.value)}
                />
              ))}
            </div>
            <h3 className="section-title">- Dominio -</h3>
            {character.dominio.map((linea, index) => (
              <input
                key={`dom-${index}`}
                className="line-input"
                value={linea}
                disabled={readOnly}
                onChange={(e) => patchLine("dominio", index, e.target.value)}
              />
            ))}
          </div>
          <div>
            <h3 className="section-title">- Equipo -</h3>
            {character.equipo.map((item, index) => (
              <input
                key={`eq-${index}`}
                className="line-input"
                value={item}
                disabled={readOnly}
                onChange={(e) => patchLine("equipo", index, e.target.value)}
              />
            ))}
          </div>
        </div>

        <section>
          <div className="panel__head">
            <h3 className="section-title">- Maestrías -</h3>
            <span className="muted">descripción</span>
          </div>
          {character.maestrias.map((item) => (
            <div key={item.id} className="talento talento--pair">
              <input
                placeholder="Maestría"
                value={item.nombre}
                disabled={readOnly}
                onChange={(e) =>
                  patchNamed("maestrias", item.id, { nombre: e.target.value })
                }
              />
              <input
                placeholder="descripción"
                value={item.descripcion}
                disabled={readOnly}
                onChange={(e) =>
                  patchNamed("maestrias", item.id, { descripcion: e.target.value })
                }
              />
            </div>
          ))}
        </section>

        <section>
          <div className="panel__head">
            <h3 className="section-title">- Armas y Armadura -</h3>
            <span className="muted">notas</span>
          </div>
          {character.armas.map((item) => (
            <div key={item.id} className="talento talento--pair">
              <input
                placeholder="Arma o armadura"
                value={item.nombre}
                disabled={readOnly}
                onChange={(e) => patchNamed("armas", item.id, { nombre: e.target.value })}
              />
              <input
                placeholder="notas"
                value={item.descripcion}
                disabled={readOnly}
                onChange={(e) =>
                  patchNamed("armas", item.id, { descripcion: e.target.value })
                }
              />
            </div>
          ))}
        </section>

        <footer className="sheet-footer">
        <div>
          <strong>albor</strong>
          <div>Albor v0.4 — 2026</div>
        </div>
        <div>
          Albor es un juego de rol, fantasía y exploración creado por Augusto Marini.
          Todos los derechos reservados.
        </div>
      </footer>
    </div>
    </>
  );
}

function ResourceBox({
  title,
  leftLabel,
  rightLabel,
  actual,
  max,
  extraLabel,
  extra,
  readOnly,
  onActual,
  onMax,
  onExtra,
}: {
  title: string;
  leftLabel: string;
  rightLabel: string;
  actual: number;
  max: number;
  extraLabel?: string;
  extra?: number;
  readOnly?: boolean;
  onActual: (n: number) => void;
  onMax: (n: number) => void;
  onExtra?: (n: number) => void;
}) {
  return (
    <div className="resource-box">
      <h4>{title}</h4>
      <span className="resource">
        <label>
          {leftLabel}
          <input
            type="number"
            value={actual}
            disabled={readOnly}
            onChange={(e) => onActual(num(e.target.value, 0))}
          />
        </label>
        <span>/</span>
        <label>
          {rightLabel}
          <input
            type="number"
            value={max}
            disabled={readOnly}
            onChange={(e) => onMax(num(e.target.value, 0))}
          />
        </label>
      </span>
      {onExtra && extraLabel !== undefined && extra !== undefined && (
        <label>
          {extraLabel}
          <input
            type="number"
            value={extra}
            disabled={readOnly}
            onChange={(e) => onExtra(num(e.target.value, 0))}
          />
        </label>
      )}
    </div>
  );
}
