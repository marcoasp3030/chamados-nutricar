// Proxy para PostgREST interno: /api/postgrest/<recurso>
// O browser envia Authorization: Bearer <jwt>; repassamos ao PostgREST da VPS.
import { createFileRoute } from "@tanstack/react-router";

const URL_POSTGREST_INTERNO =
  process.env.POSTGREST_URL ?? "http://chamados_postgrest:3000";

function montarUrlDestino(splat: string | undefined, request: Request): string {
  const base = URL_POSTGREST_INTERNO.replace(/\/+$/, "");
  const path = (splat ?? "").replace(/^\/+/, "");
  const url = new URL(request.url);
  const qs = url.search;
  return `${base}/${path}${qs}`;
}

function cabecalhosProxy(request: Request): Headers {
  const headers = new Headers();
  const auth = request.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);
  const accept = request.headers.get("accept");
  if (accept) headers.set("Accept", accept);
  const profile = request.headers.get("accept-profile");
  if (profile) headers.set("Accept-Profile", profile);
  const prefer = request.headers.get("prefer");
  if (prefer) headers.set("Prefer", prefer);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  return headers;
}

async function encaminhar(request: Request, splat: string | undefined): Promise<Response> {
  const destino = montarUrlDestino(splat, request);
  const init: RequestInit = {
    method: request.method,
    headers: cabecalhosProxy(request),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }
  const resp = await fetch(destino, init);
  const body = request.method === "HEAD" ? null : await resp.arrayBuffer();
  const outHeaders = new Headers(resp.headers);
  outHeaders.delete("transfer-encoding");
  return new Response(body, { status: resp.status, headers: outHeaders });
}

export const Route = createFileRoute("/api/postgrest/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => encaminhar(request, params._splat),
      HEAD: ({ request, params }) => encaminhar(request, params._splat),
      POST: ({ request, params }) => encaminhar(request, params._splat),
      PATCH: ({ request, params }) => encaminhar(request, params._splat),
      PUT: ({ request, params }) => encaminhar(request, params._splat),
      DELETE: ({ request, params }) => encaminhar(request, params._splat),
    },
  },
});
