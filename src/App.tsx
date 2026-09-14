import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { useRole } from "./obr/useRole";
import { useParty } from "./obr/useParty";
import { useRoster } from "./obr/useRoster";
import { broadcastDiceRoll, useDiceRollFeed } from "./obr/useDiceRollFeed";
import { bindDicePlusListeners } from "./obr/dicePlus";
import { CharacterSheet } from "./components/CharacterSheet";
import { DiceLog } from "./components/DiceLog";
import { DiceRollSummary } from "./components/DiceRoller";
import { WebSheetPage } from "./components/WebSheetPage";
import {
  AlborCharacter,
  AlborState,
  makeCharacter,
  normalizeCharacter,
} from "./types";
import { isSheetView, openSheetInBrowser, copySheetUrl, suggestLocalCharacter } from "./web/sheetLink";
import { downloadBytes, downloadJson, readJsonFile, slug } from "./utils/download";
import { fillAlborPdf } from "./utils/fillPdf";

export default function App() {
  if (isSheetView()) {
    return <WebSheetPage />;
  }

  return <PartyManager web={!OBR.isAvailable} />;
}

function PartyManager({ web }: { web: boolean }) {
  const { isGM, playerId, playerName, role } = useRole();
  const players = useParty();
  const roster = useRoster();
  useDiceRollFeed();

  useEffect(() => {
    if (!OBR.isAvailable) return;
    OBR.onReady(() => {
      bindDicePlusListeners();
    });
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"sheet" | "log" | "options">("sheet");
  const importRef = useRef<HTMLInputElement>(null);

  const { characters, dicePlusEnabled, diceLog } = roster.state;

  const visible = useMemo(
    () => (isGM ? characters : characters.filter((c) => c.ownerId === playerId)),
    [characters, isGM, playerId],
  );

  useEffect(() => {
    if (selectedId && visible.some((c) => c.id === selectedId)) return;
    setSelectedId(visible[0]?.id ?? null);
  }, [visible, selectedId]);

  const selected = visible.find((c) => c.id === selectedId) ?? null;
  const [draft, setDraft] = useState<AlborCharacter | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setDirty(false);
      return;
    }
    setDraft(selected);
    setDirty(false);
  }, [selected?.id]);

  const sheet = draft && selected && draft.id === selected.id ? draft : selected;

  const confirmDiscard = useCallback(() => {
    if (!dirty) return true;
    return window.confirm("Hay cambios sin guardar. ¿Descartarlos?");
  }, [dirty]);

  if (!roster.ready || role === null) {
    return <div className="loading">Cargando la mesa...</div>;
  }

  const handleSave = () => {
    if (!sheet) return;
    roster.updateCharacter(sheet.id, sheet);
    setDirty(false);
  };

  const handleCreate = () => {
    if (!confirmDiscard()) return;
    const c = makeCharacter();
    if (!isGM) c.ownerId = playerId;
    roster.addCharacter(c);
    setDraft(c);
    setSelectedId(c.id);
    setTab("sheet");
  };

  const handleDuplicate = () => {
    if (!confirmDiscard()) return;
    if (!selected) return;
    const copy: AlborCharacter = {
      ...(sheet ?? selected),
      id: makeCharacter().id,
      nombre: `${(sheet ?? selected).nombre} (copia)`,
      ownerId: isGM ? selected.ownerId : playerId,
    };
    roster.addCharacter(copy);
    setDraft(copy);
    setSelectedId(copy.id);
  };

  const handleDiceRoll = (payload: DiceRollSummary & { characterName: string }) => {
    broadcastDiceRoll(payload);
    roster.addDiceRoll({
      characterName: payload.characterName,
      playerName: playerName ?? "",
      summary: payload.summary,
      total: payload.total,
      faces: payload.faces,
      dieSize: payload.dieSize,
      critical: payload.critical,
      fumble: payload.fumble,
      viaDicePlus: payload.viaDicePlus,
    });
  };

  const suggested =
    selected && !web
      ? suggestLocalCharacter(selected, roster.localCharacters)
      : null;

  return (
    <div className={`app ${web ? "app--web" : ""}`}>
      <header className="header">
        <div>
          <p className="wordmark">~ ~ ~ albor ~ ~ juego ~ de ~ rol ~ ~ ~</p>
          <h1>Albor</h1>
          <p className="muted">
            {web ? "Vista web (este navegador)" : isGM ? "Vista del Director (GM)" : "Vista de jugador"}
            {" · "}
            {playerName}
          </p>
        </div>
        <div className="header__actions">
          <button type="button" onClick={handleCreate}>
            Nuevo
          </button>
          <button type="button" disabled={!selected} onClick={handleDuplicate}>
            Duplicar
          </button>
          {(isGM || web) && (
            <button
              type="button"
              className="btn-danger"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                if (dirty && !confirmDiscard()) return;
                if (!window.confirm(`¿Borrar a ${selected.nombre}?`)) return;
                roster.removeCharacter(selected.id);
              }}
            >
              Eliminar
            </button>
          )}
          <button
            type="button"
            disabled={!selected}
            onClick={() => sheet && downloadJson(`${slug(sheet.nombre)}.json`, sheet)}
          >
            Exportar JSON
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!sheet) return;
              void fillAlborPdf(sheet)
                .then((bytes) =>
                  downloadBytes(`${slug(sheet.nombre)}.pdf`, bytes, "application/pdf"),
                )
                .catch((err: unknown) => {
                  window.alert(
                    err instanceof Error ? err.message : "No se pudo exportar el PDF.",
                  );
                });
            }}
          >
            Exportar PDF
          </button>
          <button type="button" onClick={() => importRef.current?.click()}>
            Importar JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const data = await readJsonFile<Partial<AlborCharacter> | Partial<AlborState>>(file);
                if (data && "characters" in data && Array.isArray(data.characters)) {
                  if (!confirmDiscard()) return;
                  if (isGM || web) {
                    roster.replaceState(data as AlborState);
                  }
                  return;
                }
                if (!confirmDiscard()) return;
                const c = normalizeCharacter(data as Partial<AlborCharacter>);
                c.id = makeCharacter().id;
                if (!isGM) c.ownerId = playerId;
                roster.addCharacter(c);
                setDraft(c);
                setSelectedId(c.id);
              } catch {
                window.alert("No se pudo importar ese archivo.");
              }
            }}
          />
          {selected && (
            <>
              <button
                type="button"
                onClick={() => void openSheetInBrowser(sheet ?? selected)}
              >
                Ver en web
              </button>
              <button type="button" onClick={() => void copySheetUrl(sheet ?? selected)}>
                Copiar enlace
              </button>
            </>
          )}
        </div>
      </header>

      <nav className="tabs">
        <button type="button" className={tab === "sheet" ? "is-active" : ""} onClick={() => setTab("sheet")}>
          Ficha
        </button>
        <button type="button" className={tab === "log" ? "is-active" : ""} onClick={() => setTab("log")}>
          Tiradas
        </button>
        <button type="button" className={tab === "options" ? "is-active" : ""} onClick={() => setTab("options")}>
          Opciones
        </button>
      </nav>

      {visible.length === 0 ? (
        <p className="muted">
          {isGM || web
            ? "Todavía no hay personajes. Creá uno o importá un JSON."
            : "El GM todavía no te asignó un personaje."}
        </p>
      ) : (
        <div className="picker">
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.id === selectedId ? "is-active" : ""}
              onClick={() => {
                if (c.id === selectedId) return;
                if (!confirmDiscard()) return;
                setSelectedId(c.id);
              }}
            >
              {c.id === selectedId && sheet ? sheet.nombre || "Sin nombre" : c.nombre || "Sin nombre"}
            </button>
          ))}
        </div>
      )}

      {tab === "sheet" && selected && (
        <>
          {!web && !isGM && roster.localCharacters.length > 0 && (
            <p className="sync-bar">
              {roster.playerSync[selected.id] ? (
                <>
                  Sincronizado con una ficha local.{" "}
                  <button type="button" onClick={() => roster.unsyncPlayerCharacter(selected.id)}>
                    Soltar
                  </button>
                </>
              ) : (
                <>
                  Sincronizar con ficha local:{" "}
                  <select
                    defaultValue={suggested?.id ?? ""}
                    onChange={(e) => {
                      if (e.target.value) void roster.syncPlayerCharacter(selected.id, e.target.value);
                    }}
                  >
                    <option value="">Elegir…</option>
                    {roster.localCharacters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </p>
          )}
          <CharacterSheet
            character={sheet ?? selected}
            isGM={isGM && !web}
            players={players}
            dicePlusEnabled={dicePlusEnabled && !web}
            dirty={dirty}
            onChange={(next) => {
              setDraft(next);
              setDirty(true);
            }}
            onSave={handleSave}
            onRolled={handleDiceRoll}
          />
        </>
      )}

      {tab === "log" && (
        <DiceLog
          entries={diceLog}
          canClear={isGM || web}
          onClear={() => roster.clearDiceLog()}
        />
      )}

      {tab === "options" && (
        <section className="panel">
          <h3>Opciones</h3>
          {(isGM || web) && (
            <label className="check">
              <input
                type="checkbox"
                checked={dicePlusEnabled}
                disabled={web}
                onChange={(e) => roster.setDicePlusEnabled(e.target.checked)}
              />
              Usar Dice+ (dados 3D en Owlbear). Si no está instalada, se tira en local.
            </label>
          )}
          {isGM && !web && (
            <label className="check">
              <input
                type="checkbox"
                checked={roster.syncWithLocal}
                onChange={(e) => void roster.setSyncWithLocal(e.target.checked)}
              />
              Sincronizar la sala con las fichas locales de este navegador
            </label>
          )}
          <p className="hint">
            Entorno: {web ? "web / localStorage" : "Owlbear Rodeo"} · metadata{" "}
            <code>com.albor/state</code>
          </p>
          <button
            type="button"
            onClick={() => downloadJson("albor-mesa.json", roster.state)}
          >
            Exportar mesa
          </button>
        </section>
      )}
    </div>
  );
}

