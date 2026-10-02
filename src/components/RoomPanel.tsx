import { useState } from "react";
import type { RoomRole } from "../room/protocol";
import type { RoomStatus } from "../room/useRoom";

export function RoomPanel({
  web,
  isGM,
  status,
  error,
  advertisedCode,
  webName,
  webRole,
  onWebName,
  onWebRole,
  onCreate,
  onJoin,
}: {
  web: boolean;
  isGM: boolean;
  status: RoomStatus;
  error: string | null;
  advertisedCode: string | null;
  webName: string;
  webRole: RoomRole;
  onWebName: (name: string) => void;
  onWebRole: (role: RoomRole) => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const busy = status === "connecting";

  return (
    <section className="panel room-panel">
      <h3>- Sala -</h3>
      {web && (
        <div className="room-panel__identity">
          <label>
            Nombre
            <input value={webName} onChange={(e) => onWebName(e.target.value)} />
          </label>
          <label>
            Rol en mesa
            <select
              value={webRole}
              onChange={(e) => onWebRole(e.target.value === "PLAYER" ? "PLAYER" : "GM")}
            >
              <option value="GM">Director</option>
              <option value="PLAYER">Jugador</option>
            </select>
          </label>
        </div>
      )}
      {isGM ? (
        <>
          <p className="hint">Creá una sala para que los jugadores se unan y veas sus hojas.</p>
          <button type="button" className="btn-primary" disabled={busy} onClick={onCreate}>
            Crear sala
          </button>
        </>
      ) : (
        <>
          {advertisedCode && (
            <div className="room-panel__invite">
              <p>
                El director abrió la sala <strong className="room-code">{advertisedCode}</strong>.
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => onJoin(advertisedCode)}
              >
                Unirse
              </button>
            </div>
          )}
          <p className="hint room-panel__or">O pegar código</p>
          <div className="room-panel__join">
            <label>
              Código
              <input
                value={code}
                maxLength={6}
                autoCapitalize="characters"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <button type="button" disabled={busy || code.trim().length === 0} onClick={() => onJoin(code)}>
              Unirse con código
            </button>
          </div>
        </>
      )}
      {error && <p className="warn">{error}</p>}
      {status === "connecting" && <p className="hint">Conectando…</p>}
    </section>
  );
}
