import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { useRole } from "./obr/useRole";
import { useRoster } from "./obr/useRoster";
import { useDiceRollFeed } from "./obr/useDiceRollFeed";
import { bindDicePlusListeners } from "./obr/dicePlus";
import { CharacterSheet } from "./components/CharacterSheet";
import { DiceLog } from "./components/DiceLog";
import { DiceRollSummary } from "./components/DiceRoller";
import { GmDiceRoller } from "./components/GmDiceRoller";
import { MesaView, type MesaCard } from "./components/MesaView";
import { WebSheetPage } from "./components/WebSheetPage";
import { Menu } from "./components/Menu";
import { AlborSun } from "./components/AlborSun";
import { DialogProvider, useDialog } from "./components/ConfirmDialog";
import { OptionsPanel } from "./components/OptionsPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { RoomPanel } from "./components/RoomPanel";
import {
  AlborCharacter,
  AlborState,
  makeCharacter,
  makeDiceRollLogEntry,
  normalizeCharacter,
} from "./types";
import { isSheetView, copySheetUrl } from "./web/sheetLink";
import { adoptSharedStorage, onAppStorageChange, storageIsEmbedded } from "./web/appStorage";
import { openBridgedApp, publishStorageBridge, startStorageBridge } from "./web/storageBridge";
import { downloadBytes, downloadJson, readJsonFile, slug } from "./utils/download";
import { fillAlborPdf } from "./utils/fillPdf";
import { useRoom } from "./room/useRoom";
import { useWebProfile } from "./room/useWebProfile";
import { applyTheme, readTheme, THEME_KEY } from "./theme";

type Tab = "mesa" | "sheet" | "gm-roll" | "log" | "options";

export default function App() {
  const [storageShared, setStorageShared] = useState(() => !storageIsEmbedded());

  useEffect(() => {
    const syncTheme = () => applyTheme(readTheme());
    startStorageBridge();
    syncTheme();
    void adoptSharedStorage().then((ok) => {
      setStorageShared(ok);
      syncTheme();
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_KEY && event.key !== null) return;
      syncTheme();
    };
    window.addEventListener("storage", onStorage);
    const unsubscribe = onAppStorageChange(() => {
      syncTheme();
      publishStorageBridge();
    });
    return () => {
      window.removeEventListener("storage", onStorage);
      unsubscribe();
    };
  }, []);

  return (
    <DialogProvider>
      {isSheetView() ? (
        <WebSheetPage />
      ) : (
        <PartyManager
          web={!OBR.isAvailable}
          storageShared={storageShared}
          onShareStorage={() => {
            void adoptSharedStorage().then((ok) => {
              setStorageShared(ok);
              if (!ok) openBridgedApp();
            });
          }}
        />
      )}
    </DialogProvider>
  );
}

function PartyManager({
  web,
  storageShared,
  onShareStorage,
}: {
  web: boolean;
  storageShared: boolean;
  onShareStorage: () => void;
}) {
  const obr = useRole();
  const webProfile = useWebProfile();
  const isGM = web ? webProfile.role === "GM" : obr.isGM;
  const playerId = web ? webProfile.id : obr.playerId;
  const playerName = web ? webProfile.name : obr.playerName;
  const roleReady = web || obr.role !== null;

  const roster = useRoster();
  const dialog = useDialog();
  useDiceRollFeed();

  const room = useRoom({
    playerId,
    playerName,
    isGM,
    onWelcome: (diceLog, dicePlusEnabled) => roster.replaceTable(diceLog, dicePlusEnabled),
    onDice: (entry) => roster.addDiceRoll(entry),
    onDicePlus: (enabled) => roster.setDicePlusEnabled(enabled),
    onDiceCleared: () => roster.clearDiceLog(),
  });

  useEffect(() => {
    if (room.status !== "open") return;
    room.publishSheets(roster.state.characters);
  }, [room.status, room.publishSheets, roster.state.characters]);

  useEffect(() => {
    if (!OBR.isAvailable) return;
    OBR.onReady(() => {
      bindDicePlusListeners();
    });
  }, []);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("sheet");
  const tabReady = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!roleReady || tabReady.current) return;
    tabReady.current = true;
    if (isGM) setTab("mesa");
  }, [roleReady, isGM]);

  useEffect(() => {
    if (!isGM && (tab === "mesa" || tab === "gm-roll")) setTab("sheet");
  }, [isGM, tab]);

  const { characters, dicePlusEnabled, diceLog } = roster.state;

  const cards = useMemo<MesaCard[]>(() => {
    const mineName = playerName || (isGM ? "Director" : "Jugador");
    const local = characters.map((character) => ({
      key: `local:${character.id}`,
      character,
      playerName: mineName,
      connected: true,
      mine: true,
    }));
    if (!isGM) return local;
    const remote = room.remoteSheets
      .filter((bundle) => bundle.playerId !== playerId)
      .flatMap((bundle) => {
        const member = room.members.find((item) => item.playerId === bundle.playerId);
        const localIds = new Set(characters.map((character) => character.id));
        return bundle.characters
          .filter((character) => !localIds.has(character.id))
          .map((character) => ({
            key: `remote:${bundle.playerId}:${character.id}`,
            character,
            playerName: bundle.name || member?.name || "Jugador",
            connected: member?.connected ?? false,
            mine: false,
          }));
      });
    return [...local, ...remote];
  }, [characters, isGM, playerId, playerName, room.members, room.remoteSheets]);

  const otherPlayers = room.members.filter(
    (member) => member.playerId !== playerId && member.role === "PLAYER",
  ).length;

  useEffect(() => {
    if (isGM) return;
    if (selectedKey && cards.some((card) => card.key === selectedKey)) return;
    setSelectedKey(cards[0]?.key ?? null);
  }, [cards, isGM, selectedKey]);

  const selected = cards.find((card) => card.key === selectedKey) ?? null;
  const [draft, setDraft] = useState<AlborCharacter | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!selected || !selected.mine) {
      setDraft(null);
      setDirty(false);
      return;
    }
    if (!dirty) {
      setDraft(selected.character);
      return;
    }
    if (draft?.id !== selected.character.id) {
      setDraft(selected.character);
      setDirty(false);
    }
  }, [selected, dirty, draft?.id]);

  const sheet =
    selected && selected.mine && draft && draft.id === selected.character.id
      ? draft
      : selected?.character ?? null;

  const confirmDiscard = useCallback(async () => {
    if (!dirty) return true;
    return dialog.confirm({
      message: "Hay cambios sin guardar. ¿Descartarlos?",
      confirmLabel: "Descartar",
      danger: true,
    });
  }, [dirty, dialog]);

  if (!roster.ready || !roleReady || !playerId) {
    return (
      <div className="loading" role="status">
        <AlborSun size={96} variant="line" />
        <p>Cargando la mesa...</p>
      </div>
    );
  }

  const openCard = async (key: string) => {
    if (key === selectedKey) {
      setTab("sheet");
      return;
    }
    if (!(await confirmDiscard())) return;
    setSelectedKey(key);
    setTab("sheet");
  };

  const handleSave = () => {
    if (!sheet || !selected?.mine) return;
    roster.updateCharacter(sheet.id, sheet);
    setDirty(false);
  };

  const handleCreate = async () => {
    if (!(await confirmDiscard())) return;
    const character = makeCharacter();
    character.ownerId = playerId;
    roster.addCharacter(character);
    setDraft(character);
    setSelectedKey(`local:${character.id}`);
    setTab("sheet");
  };

  const handleDuplicate = async () => {
    if (!selected?.mine || !sheet) return;
    if (!(await confirmDiscard())) return;
    const copy: AlborCharacter = {
      ...sheet,
      id: makeCharacter().id,
      nombre: `${sheet.nombre} (copia)`,
      ownerId: playerId,
    };
    roster.addCharacter(copy);
    setDraft(copy);
    setSelectedKey(`local:${copy.id}`);
    setTab("sheet");
  };

  const handleDiceRoll = (payload: DiceRollSummary & { characterName: string }) => {
    const entry = makeDiceRollLogEntry({
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
    if (room.status === "open") room.sendDice(entry);
    else roster.addDiceRoll(entry);
  };

  const viewLabel = web
    ? `Vista web · ${isGM ? "Director" : "Jugador"}`
    : isGM
      ? "Vista del Director (GM)"
      : "Vista de jugador";

  return (
    <div className={`app ${web ? "app--web" : ""}`}>
      {!storageShared && (
        <div className="storage-banner">
          <p>Owlbear y la página están guardando fichas distintas.</p>
          <button type="button" onClick={onShareStorage}>
            Usar las mismas
          </button>
        </div>
      )}
      <header className="header">
        <p className="wordmark">~ ~ ~ albor ~ ~ juego ~ de ~ rol ~ ~ ~</p>
        <div className="header__row">
          <div className="header__brand">
            <AlborSun size={40} />
            <div>
              <h1>Albor</h1>
              <p className="muted header__subtitle">
                {viewLabel}
                {" · "}
                {playerName}
                {room.status === "open" && room.code ? ` · sala ${room.code}` : ""}
              </p>
            </div>
          </div>
          <div className="header__actions">
            {room.status === "open" && room.code && (
              <>
                <span className="room-code" title="Código de la sala">
                  {room.code}
                </span>
                <button type="button" onClick={room.leaveRoom}>
                  Salir
                </button>
                <span className="header__sep" aria-hidden="true" />
              </>
            )}
            <button type="button" onClick={() => void handleCreate()}>
              Nuevo
            </button>
            <button
              type="button"
              className={tab === "options" ? "is-active" : ""}
              onClick={() => setTab("options")}
            >
              Opciones
            </button>
            <ThemeToggle />
            <button
              type="button"
              disabled={!selected?.mine}
              onClick={() => void handleDuplicate()}
            >
              Duplicar
            </button>
            <Menu
              label="Archivo"
              items={[
                {
                  label: "Exportar JSON",
                  disabled: !sheet,
                  onSelect: () => sheet && downloadJson(`${slug(sheet.nombre)}.json`, sheet),
                },
                {
                  label: "Exportar PDF",
                  disabled: !sheet,
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
                    roster.replaceState(data as AlborState);
                    setSelectedKey(null);
                    if (isGM) setTab("mesa");
                    return;
                  }
                  if (!(await confirmDiscard())) return;
                  const character = normalizeCharacter(data as Partial<AlborCharacter>);
                  character.id = makeCharacter().id;
                  character.ownerId = playerId;
                  roster.addCharacter(character);
                  setDraft(character);
                  setSelectedKey(`local:${character.id}`);
                  setTab("sheet");
                } catch {
                  await dialog.alert("No se pudo importar ese archivo.");
                }
              }}
            />
            {sheet && (
              <Menu
                label="Compartir"
                align="end"
                items={[
                  { label: "Ver en web", onSelect: () => void openBridgedApp() },
                  { label: "Copiar enlace", onSelect: () => void copySheetUrl(sheet) },
                ]}
              />
            )}
            {selected?.mine && (
              <>
                <span className="header__sep" aria-hidden="true" />
                <button
                  type="button"
                  className="btn-danger"
                  onClick={async () => {
                    if (!(await confirmDiscard())) return;
                    const ok = await dialog.confirm({
                      message: `¿Borrar a ${selected.character.nombre}?`,
                      confirmLabel: "Eliminar",
                      danger: true,
                    });
                    if (ok) roster.removeCharacter(selected.character.id);
                  }}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {room.status !== "open" && (
        <RoomPanel
          web={web}
          isGM={isGM}
          status={room.status}
          error={room.error}
          advertisedCode={room.advertisedCode}
          webName={webProfile.name}
          webRole={webProfile.role}
          onWebName={webProfile.setName}
          onWebRole={webProfile.setRole}
          onCreate={() => void room.createRoom()}
          onJoin={room.joinRoom}
        />
      )}
      {room.status === "open" && (
        <p className="hint room-status">Sala {room.code} · conectado</p>
      )}
      {room.status === "open" && room.error && <p className="warn">{room.error}</p>}

      <nav className="tabs">
        {isGM && (
          <button type="button" className={tab === "mesa" ? "is-active" : ""} onClick={() => setTab("mesa")}>
            Mesa
          </button>
        )}
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
      </nav>

      {tab === "mesa" && isGM && (
        <MesaView
          cards={cards}
          roomOpen={room.status === "open"}
          otherPlayers={otherPlayers}
          onOpen={(key) => void openCard(key)}
          onCreate={() => void handleCreate()}
        />
      )}

      {tab === "sheet" && !selected && (
        <div className="empty-state">
          <AlborSun size={96} variant="line" />
          <p>
            {isGM
              ? "Todavía no hay personajes. Creá uno o importá un JSON."
              : "Creá tu personaje. Al unirte a la sala, el director va a verlo."}
          </p>
          <div className="empty-state__actions">
            <button type="button" className="btn-primary" onClick={() => void handleCreate()}>
              Nuevo
            </button>
            <button type="button" onClick={() => importRef.current?.click()}>
              Importar JSON
            </button>
          </div>
        </div>
      )}

      {tab === "sheet" && selected && sheet && (
        <>
          {isGM && (
            <button type="button" className="back-link" onClick={() => setTab("mesa")}>
              ← Volver a la mesa
            </button>
          )}
          {isGM && cards.length > 0 && (
            <div className="picker">
              {cards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={card.key === selectedKey ? "is-active" : ""}
                  onClick={() => void openCard(card.key)}
                >
                  <span className="picker__name">
                    {card.key === selectedKey ? sheet.nombre || "Sin nombre" : card.character.nombre || "Sin nombre"}
                  </span>
                  <small className="picker__owner">
                    {card.mine ? "director" : card.playerName}
                  </small>
                </button>
              ))}
            </div>
          )}
          {!selected.mine && (
            <p className="read-banner">
              {selected.playerName} · {selected.connected ? "solo lectura" : "desconectado · solo lectura"}
            </p>
          )}
          <CharacterSheet
            character={sheet}
            readOnly={!selected.mine}
            dicePlusEnabled={dicePlusEnabled && !web}
            dirty={dirty}
            onChange={
              selected.mine
                ? (next) => {
                    setDraft(next);
                    setDirty(true);
                  }
                : undefined
            }
            onSave={selected.mine ? handleSave : undefined}
            onRolled={selected.mine ? handleDiceRoll : undefined}
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
          canClear={isGM}
          onClear={() => {
            if (room.status === "open") room.sendClearDice();
            else roster.clearDiceLog();
          }}
        />
      )}

      {tab === "options" && (
        <OptionsPanel
          isGM={isGM}
          web={web}
          dicePlusEnabled={dicePlusEnabled}
          onDicePlusChange={(enabled) => {
            roster.setDicePlusEnabled(enabled);
            if (room.status === "open" && isGM) room.sendDicePlus(enabled);
          }}
          onExport={() => downloadJson("albor-mesa.json", roster.state)}
        />
      )}
    </div>
  );
}
