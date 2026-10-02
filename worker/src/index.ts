import type { Env } from "./env";
import { Room } from "./room";

export { Room };
export type { Env };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
}

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") return origin;
  if (host === "albor-hoja-owlbear.pages.dev" || host.endsWith(".albor-hoja-owlbear.pages.dev")) {
    return origin;
  }
  return null;
}

function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = allowedOrigin(request.headers.get("Origin"));
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return headers;
}

function json(request: Request, body: unknown, status = 200): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/rooms") {
      const gmToken = crypto.randomUUID();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = makeCode();
        const created = await env.ROOM.getByName(code).init(gmToken);
        if (!created) continue;
        console.log(JSON.stringify({ event: "room_created", code }));
        return json(request, { code, gmToken });
      }
      console.log(JSON.stringify({ event: "room_create_failed" }));
      return json(request, { error: "No se pudo crear la sala." }, 500);
    }

    const roomMatch = url.pathname.match(/^\/rooms\/([A-Z2-9]{6})$/);
    if (roomMatch && request.headers.get("Upgrade") === "websocket") {
      const origin = request.headers.get("Origin");
      if (origin && !allowedOrigin(origin)) {
        return new Response("Origen no permitido", { status: 403 });
      }
      const code = roomMatch[1];
      // El upgrade de WebSocket sigue en fetch: la hibernación engancha el socket ahí.
      return env.ROOM.getByName(code).fetch(request);
    }

    return json(request, { error: "No encontrado" }, 404);
  },
};
