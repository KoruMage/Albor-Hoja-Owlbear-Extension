import type { AlborCharacter } from "../types";
import { STATS_INFO } from "../types";

export interface MesaCard {
  key: string;
  character: AlborCharacter;
  playerName: string;
  connected: boolean;
  mine: boolean;
}

function statLine(character: AlborCharacter): string {
  return STATS_INFO.map((stat) => {
    const block = character.stats[stat.key];
    return `${stat.short} ${block.valor}d${block.dado}`;
  }).join(" · ");
}

export function MesaView({
  cards,
  roomOpen,
  otherPlayers,
  onOpen,
  onCreate,
}: {
  cards: MesaCard[];
  roomOpen: boolean;
  otherPlayers: number;
  onOpen: (key: string) => void;
  onCreate: () => void;
}) {
  const note = !roomOpen
    ? "Creá una sala para ver las hojas de los jugadores."
    : otherPlayers === 0
      ? "Todavía no hay jugadores en la sala."
      : cards.every((card) => card.mine)
        ? "Hay jugadores en la sala, pero todavía no publicaron una ficha."
        : null;

  return (
    <section className="panel mesa">
      <div className="panel__head">
        <h3>- Mesa -</h3>
        <button type="button" className="btn-primary" onClick={onCreate}>
          Nuevo
        </button>
      </div>
      {note && <p className="hint mesa__note">{note}</p>}
      {cards.length === 0 ? (
        <p className="hint">Todavía no hay personajes. Creá uno para la mesa.</p>
      ) : (
        <div className="mesa__grid">
          {cards.map((card) => {
            const who = card.mine
              ? `${card.playerName} · director`
              : `${card.playerName} · ${card.connected ? "conectado" : "desconectado"}`;
            return (
              <article key={card.key} className="mesa-card">
                <h4>{card.character.nombre || "Sin nombre"}</h4>
                {card.character.concepto && <p className="mesa-card__concept">{card.character.concepto}</p>}
                <p className="mesa-card__who">{who}</p>
                <p className="mesa-card__meta">
                  Nivel {card.character.nivel}
                  {card.character.rol ? ` · ${card.character.rol}` : ""}
                </p>
                <p className="mesa-card__stats">{statLine(card.character)}</p>
                <p className="mesa-card__resources">
                  DET {card.character.det.actual}/{card.character.det.max}
                  {" · "}
                  Chispa {card.character.chispa.actual}/{card.character.chispa.max}
                  {" · "}
                  Suerte {card.character.suerte.actual}/{card.character.suerte.max}
                  {" · "}
                  Heridas {card.character.heridas.actual}/{card.character.heridas.max}
                </p>
                <button type="button" onClick={() => onOpen(card.key)}>
                  {card.mine ? "Editar" : "Ver"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
