import { useRef } from "react";
import type { Player } from "@owlbear-rodeo/sdk";
import {
  AlborCharacter,
  Arma,
  DIE_SIZES,
  DieSize,
  STATS_INFO,
  StatKey,
  Talento,
  defaultChispaMax,
  defaultDetMax,
  newId,
  normalizeArma,
} from "../types";
import { DiceRoller, type DiceRollSummary } from "./DiceRoller";
import { ArmaBlock } from "./sheet/ArmaBlock";
import { AreaField, NumberField, TextField, WriteLine } from "./sheet/fields";
import { ResourceBox, SingleResource } from "./sheet/ResourceBox";

const WORDMARK = "~ ~ ~ albor ~ ~ juego ~ de ~ rol ~ ~ ~";

export function CharacterSheet({
  character,
  readOnly,
  isGM,
  players,
  dicePlusEnabled,
  dirty,
  onChange,
  onAssign,
  onSave,
  onRolled,
}: {
  character: AlborCharacter;
  readOnly?: boolean;
  isGM?: boolean;
  players?: Player[];
  dicePlusEnabled: boolean;
  dirty?: boolean;
  onChange?: (next: AlborCharacter) => void;
  onAssign?: (ownerId: string | null) => void;
  onSave?: () => void;
  onRolled?: (payload: DiceRollSummary & { characterName: string }) => void;
}) {
  const addedKey = useRef<string | null>(null);

  const patch = (partial: Partial<AlborCharacter>) => {
    if (!onChange || readOnly) return;
    onChange({ ...character, ...partial });
  };

  const addLine = (key: "equipo" | "dominio") => {
    addedKey.current = `${key}:${character[key].length}`;
    patch({ [key]: [...character[key], ""] });
  };

  const addMaestria = () => {
    const item = { id: newId(), nombre: "", descripcion: "" };
    addedKey.current = item.id;
    patch({ maestrias: [...character.maestrias, item] });
  };

  const addArma = () => {
    const item = normalizeArma(undefined);
    addedKey.current = item.id;
    patch({ armas: [...character.armas, item] });
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
    key: "lazos" | "maestrias",
    id: string,
    next: Partial<Talento>,
  ) => {
    patch({
      [key]: character[key].map((item) => (item.id === id ? { ...item, ...next } : item)),
    });
  };

  const patchArma = (id: string, next: Partial<Arma>) => {
    patch({
      armas: character.armas.map((item) => (item.id === id ? { ...item, ...next } : item)),
    });
  };

  const patchLine = (key: "etiquetas" | "equipo" | "dominio", index: number, value: string) => {
    const next = [...character[key]];
    next[index] = value;
    patch({ [key]: next });
  };

  const showAssign = Boolean(isGM && players);
  const ownerLabel = (() => {
    if (!character.ownerId) return "Sin asignar";
    const owner = players?.find((p) => p.id === character.ownerId);
    if (!owner) return "Asignado (desconectado)";
    return `${owner.name}${owner.role === "GM" ? " (GM)" : ""}`;
  })();

  const nameField = (
    <label className="field-center">
      Nombre del Personaje
      <TextField
        value={character.nombre}
        readOnly={readOnly}
        onChange={(nombre) => patch({ nombre })}
      />
    </label>
  );

  return (
    <div className={readOnly ? "sheet-stack sheet-stack--read" : "sheet-stack"}>
      {!readOnly && onSave && (
        <div className={dirty ? "sheet-save sheet-save--dirty" : "sheet-save"}>
          <span className={dirty ? "sheet-save__status warn" : "sheet-save__status muted"}>
            {dirty ? "Hay cambios sin guardar." : "Los cambios se guardan al pulsar Guardar."}
          </span>
          <button type="button" className="btn-primary" disabled={!dirty} onClick={onSave}>
            Guardar
          </button>
        </div>
      )}
      {!readOnly && onRolled && (
        <DiceRoller
          character={character}
          dicePlusEnabled={dicePlusEnabled}
          onRolled={onRolled}
        />
      )}

      <div className="sheet">
        <p className="wordmark">{WORDMARK}</p>

        {nameField}

        <label className="field-full field-concept">
          Concepto del personaje
          <TextField
            value={character.concepto}
            readOnly={readOnly}
            onChange={(concepto) => patch({ concepto })}
          />
        </label>

        <div className={showAssign ? "id-row id-row--gm" : "id-row"}>
          <label>
            Linaje
            <TextField
              value={character.linaje}
              readOnly={readOnly}
              onChange={(linaje) => patch({ linaje })}
            />
          </label>
          <label>
            Ocupación (o Gremio)
            <TextField
              value={character.ocupacion}
              readOnly={readOnly}
              onChange={(ocupacion) => patch({ ocupacion })}
            />
          </label>
          <label>
            Rol
            <TextField
              value={character.rol}
              readOnly={readOnly}
              onChange={(rol) => patch({ rol })}
            />
          </label>
          <label className="id-row__num">
            Nivel
            <NumberField
              value={character.nivel}
              min={1}
              fallback={1}
              readOnly={readOnly}
              onChange={(nivel) => patch({ nivel })}
            />
          </label>
          <label className="id-row__num">
            Tamaño
            <TextField
              value={character.tamano}
              readOnly={readOnly}
              onChange={(tamano) => patch({ tamano })}
            />
          </label>
          {showAssign && players && (
            <label className="id-row__assign">
              Asignado a
              {readOnly ? (
                <TextField value={ownerLabel} readOnly onChange={() => undefined} />
              ) : (
                <select
                  value={character.ownerId ?? ""}
                  onChange={(e) => {
                    const ownerId = e.target.value || null;
                    if (onAssign) onAssign(ownerId);
                    else patch({ ownerId });
                  }}
                >
                  <option value="">Sin asignar</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.role === "GM" ? " (GM)" : ""}
                    </option>
                  ))}
                  {character.ownerId && !players.some((p) => p.id === character.ownerId) && (
                    <option value={character.ownerId}>Asignado (desconectado)</option>
                  )}
                </select>
              )}
            </label>
          )}
        </div>

        <div className="attr-bar">
          {STATS_INFO.map((s) => (
            <div key={s.key} className="stat-block">
              <div className="stat-tab">
                <strong>{s.label.toUpperCase()}</strong>
                <NumberField
                  value={character.stats[s.key].valor}
                  min={1}
                  max={8}
                  fallback={1}
                  readOnly={readOnly}
                  ariaLabel={`${s.label} dados`}
                  onChange={(n) => patchStat(s.key, "valor", n)}
                />
              </div>
              <div className="dado-banner">
                <span>dado base</span>
                {readOnly ? (
                  <span className="dado-banner__value">d{character.stats[s.key].dado}</span>
                ) : (
                  <select
                    value={character.stats[s.key].dado}
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
                )}
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
            small
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
          <SingleResource title="Movimiento">
            <NumberField
              value={character.mov}
              readOnly={readOnly}
              onChange={(mov) => patch({ mov })}
            />
          </SingleResource>
          <SingleResource title="Adrenalina (+VIG)">
            <TextField
              value={character.adrenalina}
              readOnly={readOnly}
              onChange={(adrenalina) => patch({ adrenalina })}
            />
          </SingleResource>
          <SingleResource title="DP">
            <NumberField
              value={character.dp}
              readOnly={readOnly}
              onChange={(dp) => patch({ dp })}
            />
          </SingleResource>
        </div>

        <section className="sheet-section">
          <div className="sheet-head">
            <h3 className="section-title">- Talentos -</h3>
            {!readOnly && (
              <button
                type="button"
                className="btn-small"
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
            <div key={t.id} className={readOnly ? "talento talento--pair" : "talento"}>
              <TextField
                className="talento__name"
                placeholder="Nombre"
                ariaLabel="Nombre del talento"
                value={t.nombre}
                readOnly={readOnly}
                onChange={(nombre) => patchTalento(t.id, { nombre })}
              />
              <AreaField
                placeholder="descripción"
                ariaLabel="Descripción del talento"
                rows={1}
                value={t.descripcion}
                readOnly={readOnly}
                onChange={(descripcion) => patchTalento(t.id, { descripcion })}
              />
              {!readOnly && (
                <button
                  type="button"
                  className="btn-danger talento__remove"
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

        <section className="sheet-section">
          <div className="sheet-head">
            <h3 className="section-title">- Notas -</h3>
          </div>
          <AreaField
            className="notes"
            ariaLabel="Notas"
            rows={3}
            value={character.notas}
            readOnly={readOnly}
            onChange={(notas) => patch({ notas })}
          />
        </section>
      </div>

      <div className="sheet">
        <p className="wordmark">{WORDMARK}</p>
        {nameField}

        <section className="sheet-section">
          <div className="sheet-head">
            <h3 className="section-title">- Lazos -</h3>
            <span className="sheet-head__hint">notas</span>
          </div>
          {character.lazos.map((item, index) => (
            <div key={item.id} className="talento talento--pair">
              <TextField
                className="talento__name"
                placeholder="Lazo"
                ariaLabel={`Lazo ${index + 1}`}
                value={item.nombre}
                readOnly={readOnly}
                onChange={(nombre) => patchNamed("lazos", item.id, { nombre })}
              />
              <TextField
                className="talento__notes"
                placeholder="notas"
                ariaLabel={`Notas del lazo ${index + 1}`}
                value={item.descripcion}
                readOnly={readOnly}
                onChange={(descripcion) => patchNamed("lazos", item.id, { descripcion })}
              />
            </div>
          ))}
        </section>

        <div className="page2-mid">
          <div>
            <section className="sheet-section">
              <div className="sheet-head">
                <h3 className="section-title">- Etiquetas -</h3>
              </div>
              <div className="tag-grid">
                {character.etiquetas.map((etiqueta, index) => (
                  <WriteLine
                    key={`etq-${index}`}
                    ariaLabel={`Etiqueta ${index + 1}`}
                    value={etiqueta}
                    readOnly={readOnly}
                    onChange={(value) => patchLine("etiquetas", index, value)}
                  />
                ))}
              </div>
            </section>
            <section className="sheet-section">
              <div className="sheet-head">
                <h3 className="section-title">- Dominio -</h3>
                {!readOnly && (
                  <button type="button" onClick={() => addLine("dominio")}>
                    Agregar
                  </button>
                )}
              </div>
              {character.dominio.map((linea, index) => (
                <WriteLine
                  key={`dom-${index}`}
                  ariaLabel={`Dominio ${index + 1}`}
                  value={linea}
                  readOnly={readOnly}
                  autoFocus={addedKey.current === `dominio:${index}`}
                  onChange={(value) => patchLine("dominio", index, value)}
                />
              ))}
            </section>
          </div>
          <section className="sheet-section">
            <div className="sheet-head">
              <h3 className="section-title">- Equipo -</h3>
              {!readOnly && (
                <button type="button" onClick={() => addLine("equipo")}>
                  Agregar
                </button>
              )}
            </div>
            {character.equipo.map((item, index) => (
              <WriteLine
                key={`eq-${index}`}
                ariaLabel={`Equipo ${index + 1}`}
                value={item}
                readOnly={readOnly}
                autoFocus={addedKey.current === `equipo:${index}`}
                onChange={(value) => patchLine("equipo", index, value)}
              />
            ))}
          </section>
        </div>

        <section className="sheet-section">
          <div className="sheet-head">
            <h3 className="section-title">- Maestrías -</h3>
            <div className="sheet-head__aside">
              <span className="sheet-head__hint">descripción</span>
              {!readOnly && (
                <button type="button" onClick={addMaestria}>
                  Agregar
                </button>
              )}
            </div>
          </div>
          {character.maestrias.map((item, index) => (
            <div key={item.id} className="talento talento--pair talento--wide">
              <TextField
                className="talento__name"
                placeholder="Maestría"
                ariaLabel={`Maestría ${index + 1}`}
                value={item.nombre}
                readOnly={readOnly}
                autoFocus={addedKey.current === item.id}
                onChange={(nombre) => patchNamed("maestrias", item.id, { nombre })}
              />
              <TextField
                placeholder="descripción"
                ariaLabel={`Descripción de la maestría ${index + 1}`}
                value={item.descripcion}
                readOnly={readOnly}
                onChange={(descripcion) => patchNamed("maestrias", item.id, { descripcion })}
              />
            </div>
          ))}
        </section>

        <section className="sheet-section">
          <div className="sheet-head">
            <h3 className="section-title">- Armas y Armadura -</h3>
            <div className="sheet-head__aside">
              <span className="sheet-head__hint">1 dado + momentum (máx. stat)</span>
              {!readOnly && (
                <button type="button" onClick={addArma}>
                  Agregar
                </button>
              )}
            </div>
          </div>
          <div className="arma-list">
            {character.armas.map((item) => (
              <ArmaBlock
                key={item.id}
                item={item}
                character={character}
                readOnly={readOnly}
                dicePlusEnabled={dicePlusEnabled}
                autoFocus={addedKey.current === item.id}
                onPatch={patchArma}
                onRolled={onRolled}
              />
            ))}
          </div>
        </section>

        <footer className="sheet-footer">
          <div className="sheet-footer__brand">
            <strong>albor</strong>
            <span>Albor v0.4 — 2026</span>
          </div>
          <p className="sheet-footer__legal">
            Albor es un juego de rol, fantasía y exploración creado por Augusto Marini.
            Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
}
