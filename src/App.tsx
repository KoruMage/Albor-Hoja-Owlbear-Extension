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
import { GmDiceRoller } from "./components/GmDiceRoller";
import { WebSheetPage } from "./components/WebSheetPage";
import { Menu } from "./components/Menu";
import { AlborSun } from "./components/AlborSun";
import { DialogProvider, useDialog } from "./components/ConfirmDialog";
import { OptionsPanel } from "./components/OptionsPanel";
import type { Player } from "@owlbear-rodeo/sdk";
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
  return (
    <DialogProvider>
      {isSheetView() ? <WebSheetPage /> : <PartyManager web={!OBR.isAvailable} />}
    </DialogProvider>
  );
}

function ownerLabel(
  ownerId: string | null,
  players: Player[],
  self: { id: string | null; name: string | null },
): string {
  if (!ownerId) return "sin asignar";
  if (ownerId === self.id) return `${self.name || "Director"} (GM)`;
  return players.find((p) => p.id === ownerId)?.name ?? "desconectado";
}

function PartyManager({ web }: { web: boolean }) {
  const { isGM, playerId, playerName, role } = useRole();
  const players = useParty();
  const roster = useRoster();
  const dialog = useDialog();
  useDiceRollFeed();

  useEffect(() => {
    if (!OBR.isAvailable) return;
    OBR.onReady(() => {
      bindDicePlusListeners();
    });
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"sheet" | "gm-roll" | "log" | "options">("sheet");
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
    if (!dirty) {
      setDraft(selected);
      return;
    }
    if (draft?.id !== selected.id) {
      setDraft(selected);
      setDirty(false);
    }
  }, [selected, dirty, draft?.id]);

  const sheet = draft && selected && draft.id === selected.id ? draft : selected;

  const confirmDiscard = useCallback(async () => {
    if (!dirty) return true;
    return dialog.confirm({
      message: "Hay cambios sin guardar. ¿Descartarlos?",
      confirmLabel: "Descartar",
      danger: true,
    });
  }, [dirty, dialog]);

  if (!roster.ready || role === null) {
    return (
      <div className="loading" role="status">
        <AlborSun size={96} variant="line" />
        <p>Cargando la mesa...</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!sheet) return;
    roster.updateCharacter(sheet.id, sheet);
    setDirty(false);
  };

  const handleCreate = async () => {
    if (!(await confirmDiscard())) return;
    const c = makeCharacter();
    if (!isGM) c.ownerId = playerId;
    roster.addCharacter(c);
    setDraft(c);
    setSelectedId(c.id);
    setTab("sheet");
  };

  const handleDuplicate = async () => {
    if (!selected) return;
    if (!(await confirmDiscard())) return;
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
        <p className="wordmark">~ ~ ~ albor ~ ~ juego ~ de ~ rol ~ ~ ~</p>
        <div className="header__row">
          <div className="header__brand">
            <AlborSun size={40} />
            <div>
              <h1>Albor</h1>
              <p className="muted header__subtitle">
                {web ? "Vista web (este navegador)" : isGM ? "Vista del Director (GM)" : "Vista de jugador"}
                {" · "}
                {playerName}
              </p>
            </div>
          </div>
          <div className="header__actions">
            <button type="button" onClick={() => void handleCreate()}>
              Nuevo
            </button>
            <button type="button" disabled={!selected} onClick={() => void handleDuplicate()}>
              Duplicar
            </button>
            <Menu
              label="Archivo"
              items={[
                {
                  label: "Exportar JSON",
                  disabled: !selected,
                  onSelect: () => sheet && downloadJson(`${slug(sheet.nombre)}.json`, sheet),
                },
                {
                  label: "Exportar PDF",
                  disabled: !selected,
                  onSelect: () => {
                    if (!sheet) return;
                    void fillAlborPdf(sheet)
                      .then((bytes) =>
                        downloadBytes(`${slug(sheet.nombre)}.pdf`, bytes, "application/pdf"),
                      )
                      .catch((err: unknown) =>
                        dialog.alert(
                          err instanceof Error ? err.message : "No se pudo exportar el PDF.",
                        ),
                      );
                  },
                },
                { label: "Importar JSON", onSelect: () => importRef.current?.click() },
              ]}
            />
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
                    if (!(await confirmDiscard())) return;
                    if (isGM || web) {
                      roster.replaceState(data as AlborState);
                    }
                    return;
                  }
                  if (!(await confirmDiscard())) return;
                  const c = normalizeCharacter(data as Partial<AlborCharacter>);
                  c.id = makeCharacter().id;
                  if (!isGM) c.ownerId = playerId;
                  roster.addCharacter(c);
                  setDraft(c);
                  setSelectedId(c.id);
                } catch {
                  await dialog.alert("No se pudo importar ese archivo.");
                }
              }}
            />
            {selected && (
              <Menu
                label="Compartir"
                align="end"
                items={[
                  { label: "Ver en web", onSelect: () => void openSheetInBrowser(sheet ?? selected) },
                  { label: "Copiar enlace", onSelect: () => void copySheetUrl(sheet ?? selected) },
                ]}
              />
            )}
            {(isGM || web) && (
              <>
                <span className="header__sep" aria-hidden="true" />
                <button
                  type="button"
                  className="btn-danger"
                  disabled={!selected}
                  onClick={async () => {
                    if (!selected) return;
                    if (!(await confirmDiscard())) return;
                    const ok = await dialog.confirm({
                      message: `¿Borrar a ${selected.nombre}?`,
                      confirmLabel: "Eliminar",
                      danger: true,
                    });
                    if (ok) roster.removeCharacter(selected.id);
                  }}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button type="button" className={tab === "sheet" ? "is-active" : ""} onClick={() => setTab("sheet")}>
          Ficha
        </button>
        {isGM && (
          <button
            type="button"
            className={tab === "gm-roll" ? "is-active" : ""}
            onClick={() => setTab("gm-roll")}
          >
            Tirador GM
          </button>
        )}
        <button type="button" className={tab === "log" ? "is-active" : ""} onClick={() => setTab("log")}>
          Tiradas
        </button>
        <button type="button" className={tab === "options" ? "is-active" : ""} onClick={() => setTab("options")}>
          Opciones
        </button>
      </nav>

      {tab === "sheet" &&
        visible.length === 0 &&
        (isGM || web ? (
          <div className="empty-state">
            <AlborSun size={96} variant="line" />
            <p>Todavía no hay personajes. Creá uno o importá un JSON.</p>
            <div className="empty-state__actions">
              <button type="button" className="btn-primary" onClick={() => void handleCreate()}>
                Nuevo
              </button>
              <button type="button" onClick={() => importRef.current?.click()}>
                Importar JSON
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <AlborSun size={96} variant="line" />
            <p>El GM todavía no te asignó un personaje.</p>
          </div>
        ))}

      {tab !== "gm-roll" && visible.length > 0 && (
        <div className="picker">
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.id === selectedId ? "is-active" : ""}
              onClick={async () => {
                if (c.id === selectedId) return;
                if (!(await confirmDiscard())) return;
                setSelectedId(c.id);
              }}
            >
              <span className="picker__name">
                {c.id === selectedId && sheet ? sheet.nombre || "Sin nombre" : c.nombre || "Sin nombre"}
              </span>
              {isGM && !web && (
                <small className="picker__owner">
                  {ownerLabel(c.ownerId, players, { id: playerId, name: playerName })}
                </small>
              )}
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
            onAssign={(ownerId) => {
              if (!selected) return;
              setDraft((prev) => (prev ? { ...prev, ownerId } : prev));
              void roster.assignOwner(selected.id, ownerId);
            }}
            onSave={handleSave}
            onRolled={handleDiceRoll}
          />
        </>
      )}

      {tab === "gm-roll" && isGM && (
        <GmDiceRoller
          dicePlusEnabled={dicePlusEnabled && !web}
          directorName={playerName || "Director"}
          onRolled={handleDiceRoll}
        />
      )}

      {tab === "log" && (
        <DiceLog
          entries={diceLog}
          canClear={isGM || web}
          onClear={() => roster.clearDiceLog()}
        />
      )}

      {tab === "options" && (
        <OptionsPanel
          isGM={isGM}
          web={web}
          dicePlusEnabled={dicePlusEnabled}
          onDicePlusChange={(enabled) => roster.setDicePlusEnabled(enabled)}
          syncWithLocal={roster.syncWithLocal}
          onSyncWithLocalChange={(enabled) => void roster.setSyncWithLocal(enabled)}
          onExport={() => downloadJson("albor-mesa.json", roster.state)}
        />
      )}
    </div>
  );
}

