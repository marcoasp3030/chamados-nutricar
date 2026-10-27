import "./lib/error-capture";

import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

/** Evita HTML em cache apontando para chunks antigos após deploy (Traefik não define no-store). */
function aplicarCabecalhosCache(response: Response): Response {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, must-revalidate");
  headers.set("Pragma", "no-cache");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** No Node, `request.url` pode ser só o path (`/assets/...`) — `new URL` precisa de base. */
const URL_BASE_INTERNA = "http://127.0.0.1";

/**
 * Pasta `dist/client` com os assets do Vite.
 * No bundle de produção o `process` vem do unenv e `process.cwd()` costuma ser `/`, o que
 * quebraria `resolve(process.cwd(), "dist", "client")`. Usamos `import.meta.url` (ficheiro
 * real do bundle em `dist/server/assets/`) e caímos para `cwd` só em dev.
 */
function obterPastaClienteEstatico(): string {
  const diretorioDesteModulo = dirname(fileURLToPath(import.meta.url));
  const aPartirDoBundle = resolve(diretorioDesteModulo, "..", "..", "client");
  if (existsSync(aPartirDoBundle)) return aPartirDoBundle;
  return resolve(process.cwd(), "dist", "client");
}

/** Servir ficheiros de `dist/client` (preset node-server não monta estáticos sozinho). */
function tipoMimePorCaminho(caminho: string): string {
  if (caminho.endsWith(".js") || caminho.endsWith(".mjs")) {
    return "application/javascript; charset=utf-8";
  }
  if (caminho.endsWith(".css")) return "text/css; charset=utf-8";
  if (caminho.endsWith(".json")) return "application/json; charset=utf-8";
  if (caminho.endsWith(".png")) return "image/png";
  if (caminho.endsWith(".jpg") || caminho.endsWith(".jpeg")) return "image/jpeg";
  if (caminho.endsWith(".svg")) return "image/svg+xml";
  if (caminho.endsWith(".ico")) return "image/x-icon";
  if (caminho.endsWith(".woff2")) return "font/woff2";
  if (caminho.endsWith(".woff")) return "font/woff";
  return "application/octet-stream";
}

async function tentarServirEstaticoVps(
  url: URL,
  metodo: string,
): Promise<Response | null> {
  const baseCliente = obterPastaClienteEstatico();
  const soLeituraCabecalho = metodo === "HEAD";

  if (url.pathname === "/favicon.ico") {
    const candidato = resolve(baseCliente, "favicon.ico");
    if (!candidato.startsWith(baseCliente)) return null;
    try {
      if (soLeituraCabecalho) {
        const s = await stat(candidato);
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "image/x-icon",
            "Content-Length": String(s.size),
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
      const buf = await readFile(candidato);
      return new Response(buf, {
        status: 200,
        headers: { "Content-Type": "image/x-icon", "Cache-Control": "public, max-age=86400" },
      });
    } catch {
      return null;
    }
  }

  if (!url.pathname.startsWith("/assets/")) return null;

  const candidato = resolve(baseCliente, url.pathname.replace(/^\//, ""));
  if (!candidato.startsWith(baseCliente)) return null;

  try {
    if (soLeituraCabecalho) {
      const s = await stat(candidato);
      return new Response(null, {
        status: 200,
        headers: {
          "Content-Type": tipoMimePorCaminho(url.pathname),
          "Content-Length": String(s.size),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    const buf = await readFile(candidato);
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": tipoMimePorCaminho(url.pathname),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (request.method === "GET" || request.method === "HEAD") {
        const url = new URL(request.url, URL_BASE_INTERNA);
        const estatico = await tentarServirEstaticoVps(url, request.method);
        if (estatico) return estatico;
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalizada = await normalizeCatastrophicSsrResponse(response);
      return aplicarCabecalhosCache(normalizada);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
