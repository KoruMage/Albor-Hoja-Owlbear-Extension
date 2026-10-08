import { DurableObject } from "cloudflare:workers";
import { normalizeCharacter, type AlborCharacter, type DiceRollLogEntry, type DieSize } from "../../src/types";
import type { ClientMessage, RemoteSheets, RoomMember, RoomRole, ServerMessage } from "../../src/room/protocol";
import type { Env } from "./env";

const DICE_LOG_MAX = 50;
const MAX_SHEETS = 40;

interface Sock {
  playerId: string;
  name: string;
  role: RoomRole;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function asText(value: unknown, max = 80): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function parseDieSize(value: unknown): DieSize | undefined {
  if (value === 4 || value === 6 || value === 8 || value === 10 || value === 12) return value;
  return undefined;
}

function parseEntry(raw: unknown): DiceRollLogEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<DiceRollLogEntry>;
  if (typeof entry.id !== "string" || !entry.id || typeof entry.summary !== "string") return null;
  const faces = Array.isArray(entry.faces)
    ? entry.faces.filter((face): face is number => typeof face === "number")
    : undefined;
  return {
    id: entry.id.slice(0, 80),
    timestamp: typeof entry.timestamp === "number" ? entry.timestamp : Date.now(),
    characterName: asText(entry.characterName, 120),
    playerName: asText(entry.playerName, 80),
    summary: entry.summary.slice(0, 240),
    total: typeof entry.total === "number" ? entry.total : 0,
    faces,
    dieSize: parseDieSize(entry.dieSize),
    critical: Boolean(entry.critical),
    fumble: Boolean(entry.fumble),
    viaDicePlus: Boolean(entry.viaDicePlus),
  };
}

function parseCharacters(raw: unknown): AlborCharacter[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_SHEETS).map((item) => normalizeCharacter(item as Partial<AlborCharacter>));
}

export class Room extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS room_meta (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          gm_token TEXT NOT NULL,
          dice_plus INTEGER NOT NULL DEFAULT 0
        )
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS members (
          player_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT NOT NULL
        )
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS sheets (
          player_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS dice (
          id TEXT PRIMARY KEY,
          json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS claims (
          character_id TEXT PRIMARY KEY,
          target_player_id TEXT NOT NULL,
          json TEXT NOT NULL,
          pending INTEGER NOT NULL DEFAULT 1
        )
      `);
    });
  }

  async init(gmToken: string): Promise<boolean> {
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO room_meta (id, gm_token, dice_plus) VALUES (1, ?, 0)",
      gmToken,
    );
    const row = this.ctx.storage.sql
      .exec<{ gm_token: string }>("SELECT gm_token FROM room_meta WHERE id = 1")
      .toArray()[0];
    return Boolean(row && safeEqual(row.gm_token, gmToken));
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Se espera WebSocket", { status: 426 });
    }
    const meta = this.ctx.storage.sql
      .exec("SELECT id FROM room_meta WHERE id = 1")
      .toArray();
    if (meta.length === 0) return new Response("Sala inexistente", { status: 404 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: ArrayBuffer | string): Promise<void> {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    let message: ClientMessage;
    try {
      message = JSON.parse(text) as ClientMessage;
    } catch {
      this.send(ws, { type: "error", message: "Mensaje ilegible." });
      return;
    }
    if (!message || typeof message !== "object" || typeof message.type !== "string") {
      this.send(ws, { type: "error", message: "Mensaje ilegible." });
      return;
    }

    const sock = ws.deserializeAttachment() as Sock | null;
    if (message.type === "hello") {
      await this.hello(ws, message);
      return;
    }
    if (!sock) {
      this.send(ws, { type: "error", message: "Primero tenés que saludar a la sala." });
      return;
    }

    if (message.type === "sheets") {
      this.acceptSheets(sock, parseCharacters(message.characters));
      return;
    }

    if (message.type === "assign") {
      if (sock.role !== "GM") return;
      const target = this.playerMember(asText(message.targetPlayerId));
      const character = this.parseOne(message.character);
      if (!target || !character) {
        this.send(ws, { type: "error", message: "Elegí un jugador de la sala." });
        return;
      }
      character.ownerId = target.playerId;
      this.removeStored(sock.playerId, character.id);
      this.upsertStored(target.playerId, target.name, character);
      this.writeClaim(character, target.playerId);
      this.broadcastSheets(sock.playerId, sock.name, this.sheetsOf(sock.playerId));
      this.broadcastSheets(target.playerId, target.name, this.sheetsOf(target.playerId));
      this.broadcast(
        { type: "sheetUpsert", character },
        (other) => other.playerId === target.playerId,
      );
      this.broadcast(
        { type: "assigned", characterId: character.id, targetPlayerId: target.playerId },
        (other) => other.role === "GM",
      );
      return;
    }

    if (message.type === "editSheet") {
      if (sock.role !== "GM") return;
      const target = this.playerMember(asText(message.targetPlayerId));
      const character = this.parseOne(message.character);
      if (!target || !character) {
        this.send(ws, { type: "error", message: "No se pudo guardar esa ficha." });
        return;
      }
      character.ownerId = target.playerId;
      this.upsertStored(target.playerId, target.name, character);
      this.writeClaim(character, target.playerId);
      this.broadcastSheets(target.playerId, target.name, this.sheetsOf(target.playerId));
      this.broadcast(
        { type: "sheetUpsert", character },
        (other) => other.playerId === target.playerId,
      );
      return;
    }

    if (message.type === "dice") {
      const entry = parseEntry(message.entry);
      if (!entry) return;
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO dice (id, json, created_at) VALUES (?, ?, ?)",
        entry.id,
        JSON.stringify(entry),
        entry.timestamp,
      );
      this.ctx.storage.sql.exec(
        `DELETE FROM dice WHERE id NOT IN (
           SELECT id FROM dice ORDER BY created_at DESC LIMIT ?
         )`,
        DICE_LOG_MAX,
      );
      this.broadcast({ type: "dice", playerId: sock.playerId, entry });
      return;
    }

    if (message.type === "dicePlus") {
      if (sock.role !== "GM") return;
      const enabled = Boolean(message.enabled);
      this.ctx.storage.sql.exec("UPDATE room_meta SET dice_plus = ? WHERE id = 1", enabled ? 1 : 0);
      this.broadcast({ type: "dicePlus", enabled });
      return;
    }

    if (message.type === "clearDice") {
      if (sock.role !== "GM") return;
      this.ctx.storage.sql.exec("DELETE FROM dice");
      this.broadcast({ type: "diceCleared" });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcastPresence(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.broadcastPresence(ws);
  }

  private async hello(
    ws: WebSocket,
    message: Extract<ClientMessage, { type: "hello" }>,
  ): Promise<void> {
    const playerId = asText(message.playerId);
    const name = asText(message.name) || "Jugador";
    const role: RoomRole = message.role === "GM" ? "GM" : "PLAYER";
    if (!playerId) {
      this.send(ws, { type: "error", message: "Falta el jugador." });
      ws.close(4001, "hola inválido");
      return;
    }
    if (role === "GM") {
      const token = typeof message.gmToken === "string" ? message.gmToken : "";
      const row = this.ctx.storage.sql
        .exec<{ gm_token: string }>("SELECT gm_token FROM room_meta WHERE id = 1")
        .toArray()[0];
      if (!row || !safeEqual(row.gm_token, token)) {
        this.send(ws, { type: "error", message: "Esta sala no te reconoce como director." });
        ws.close(4001, "token");
        return;
      }
    }

    const sock: Sock = { playerId, name, role };
    for (const other of this.ctx.getWebSockets()) {
      if (other === ws) continue;
      const prev = other.deserializeAttachment() as Sock | null;
      if (prev?.playerId === playerId) other.close(4000, "reemplazado");
    }
    ws.serializeAttachment(sock);
    this.ctx.storage.sql.exec(
      `INSERT INTO members (player_id, name, role) VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET name = excluded.name, role = excluded.role`,
      playerId,
      name,
      role,
    );

    const meta = this.ctx.storage.sql
      .exec<{ dice_plus: number }>("SELECT dice_plus FROM room_meta WHERE id = 1")
      .toArray()[0];
    this.send(ws, {
      type: "welcome",
      dicePlusEnabled: Boolean(meta?.dice_plus),
      diceLog: this.readDiceLog(),
    });
    if (role === "GM") this.send(ws, { type: "roster", sheets: this.readSheets() });
    if (role === "PLAYER") {
      for (const character of this.pendingFor(playerId)) {
        this.send(ws, { type: "sheetUpsert", character });
      }
    }
    this.broadcastPresence();
  }

  private parseOne(raw: unknown): AlborCharacter | null {
    if (!raw || typeof raw !== "object") return null;
    const character = normalizeCharacter(raw as Partial<AlborCharacter>);
    if (!character.id) return null;
    return character;
  }

  private sameSheet(a: AlborCharacter, b: AlborCharacter): boolean {
    return JSON.stringify(normalizeCharacter(a)) === JSON.stringify(normalizeCharacter(b));
  }

  private playerMember(playerId: string): { playerId: string; name: string } | null {
    if (!playerId) return null;
    const row = this.ctx.storage.sql
      .exec<{ player_id: string; name: string; role: string }>(
        "SELECT player_id, name, role FROM members WHERE player_id = ?",
        playerId,
      )
      .toArray()[0];
    if (!row || row.role === "GM") return null;
    return { playerId: row.player_id, name: row.name || "Jugador" };
  }

  private claimedIds(): Set<string> {
    const rows = this.ctx.storage.sql
      .exec<{ character_id: string }>("SELECT character_id FROM claims")
      .toArray();
    return new Set(rows.map((row) => row.character_id));
  }

  private pendingFor(playerId: string): AlborCharacter[] {
    const rows = this.ctx.storage.sql
      .exec<{ json: string }>(
        "SELECT json FROM claims WHERE target_player_id = ? AND pending = 1",
        playerId,
      )
      .toArray();
    const characters: AlborCharacter[] = [];
    for (const row of rows) {
      try {
        const character = this.parseOne(JSON.parse(row.json));
        if (character) characters.push(character);
      } catch {
        // fila dañada
      }
    }
    return characters;
  }

  private writeClaim(character: AlborCharacter, targetPlayerId: string): void {
    const stored = normalizeCharacter(character);
    this.ctx.storage.sql.exec(
      `INSERT INTO claims (character_id, target_player_id, json, pending) VALUES (?, ?, ?, 1)
       ON CONFLICT(character_id) DO UPDATE SET
         target_player_id = excluded.target_player_id,
         json = excluded.json,
         pending = 1`,
      stored.id,
      targetPlayerId,
      JSON.stringify(stored),
    );
  }

  private sheetsOf(playerId: string): AlborCharacter[] {
    const row = this.ctx.storage.sql
      .exec<{ json: string }>("SELECT json FROM sheets WHERE player_id = ?", playerId)
      .toArray()[0];
    if (!row) return [];
    try {
      return parseCharacters(JSON.parse(row.json));
    } catch {
      return [];
    }
  }

  private writeSheets(playerId: string, name: string, characters: AlborCharacter[]): void {
    const kept = characters.slice(-MAX_SHEETS);
    this.ctx.storage.sql.exec(
      `INSERT INTO sheets (player_id, name, json, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET name = excluded.name, json = excluded.json, updated_at = excluded.updated_at`,
      playerId,
      name,
      JSON.stringify(kept),
      Date.now(),
    );
  }

  private upsertStored(playerId: string, name: string, character: AlborCharacter): void {
    const rest = this.sheetsOf(playerId).filter((item) => item.id !== character.id);
    this.writeSheets(playerId, name, [...rest, character]);
  }

  private removeStored(playerId: string, characterId: string): void {
    const row = this.ctx.storage.sql
      .exec<{ name: string }>("SELECT name FROM sheets WHERE player_id = ?", playerId)
      .toArray()[0];
    if (!row) return;
    this.writeSheets(
      playerId,
      row.name,
      this.sheetsOf(playerId).filter((item) => item.id !== characterId),
    );
  }

  private acceptSheets(sock: Sock, published: AlborCharacter[]): void {
    let characters = published;
    const resent: AlborCharacter[] = [];
    if (sock.role === "GM") {
      const claimed = this.claimedIds();
      characters = characters.filter((character) => !claimed.has(character.id));
    } else {
      const rows = this.ctx.storage.sql
        .exec<{ json: string; pending: number }>(
          "SELECT json, pending FROM claims WHERE target_player_id = ?",
          sock.playerId,
        )
        .toArray();
      for (const row of rows) {
        if (Number(row.pending) === 0) continue;
        let claim: AlborCharacter | null = null;
        try {
          claim = this.parseOne(JSON.parse(row.json));
        } catch {
          continue;
        }
        if (!claim) continue;
        const incoming = characters.find((character) => character.id === claim.id);
        if (incoming && this.sameSheet(incoming, claim)) {
          this.ctx.storage.sql.exec(
            "UPDATE claims SET pending = 0, json = ? WHERE character_id = ?",
            JSON.stringify(normalizeCharacter(claim)),
            claim.id,
          );
          continue;
        }
        characters = characters.filter((character) => character.id !== claim.id);
        characters.push(claim);
        resent.push(claim);
      }
    }
    this.writeSheets(sock.playerId, sock.name, characters);
    this.broadcastSheets(sock.playerId, sock.name, this.sheetsOf(sock.playerId));
    for (const character of resent) {
      this.broadcast(
        { type: "sheetUpsert", character },
        (other) => other.playerId === sock.playerId,
      );
    }
  }

  private broadcastSheets(playerId: string, name: string, characters: AlborCharacter[]): void {
    this.broadcast(
      { type: "sheets", playerId, name, characters },
      (other) => other.role === "GM" && other.playerId !== playerId,
    );
  }

  private readDiceLog(): DiceRollLogEntry[] {
    const rows = this.ctx.storage.sql
      .exec<{ json: string }>("SELECT json FROM dice ORDER BY created_at DESC LIMIT ?", DICE_LOG_MAX)
      .toArray();
    const log: DiceRollLogEntry[] = [];
    for (const row of rows) {
      try {
        const entry = parseEntry(JSON.parse(row.json));
        if (entry) log.push(entry);
      } catch {
        // fila dañada
      }
    }
    return log;
  }

  private readSheets(): RemoteSheets[] {
    const rows = this.ctx.storage.sql
      .exec<{ player_id: string; name: string; json: string }>(
        "SELECT player_id, name, json FROM sheets",
      )
      .toArray();
    const sheets: RemoteSheets[] = [];
    for (const row of rows) {
      try {
        sheets.push({
          playerId: row.player_id,
          name: row.name,
          characters: parseCharacters(JSON.parse(row.json)),
        });
      } catch {
        // fila dañada
      }
    }
    return sheets;
  }

  private memberList(except?: WebSocket): RoomMember[] {
    const live = new Map<string, Sock>();
    for (const sock of this.ctx.getWebSockets()) {
      if (sock === except) continue;
      const att = sock.deserializeAttachment() as Sock | null;
      if (att) live.set(att.playerId, att);
    }
    const rows = this.ctx.storage.sql
      .exec<{ player_id: string; name: string; role: string }>(
        "SELECT player_id, name, role FROM members",
      )
      .toArray();
    return rows.map((row) => {
      const current = live.get(row.player_id);
      const role: RoomRole = row.role === "GM" ? "GM" : "PLAYER";
      return {
        playerId: row.player_id,
        name: current?.name || row.name,
        role: current?.role || role,
        connected: Boolean(current),
      };
    });
  }

  private broadcastPresence(except?: WebSocket): void {
    this.broadcast({ type: "presence", members: this.memberList(except) }, undefined, except);
  }

  private broadcast(message: ServerMessage, filter?: (sock: Sock) => boolean, except?: WebSocket): void {
    const payload = JSON.stringify(message);
    for (const sock of this.ctx.getWebSockets()) {
      if (sock === except) continue;
      const att = sock.deserializeAttachment() as Sock | null;
      if (!att) continue;
      if (filter && !filter(att)) continue;
      try {
        sock.send(payload);
      } catch {
        // socket cerrado
      }
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // socket cerrado
    }
  }
}
