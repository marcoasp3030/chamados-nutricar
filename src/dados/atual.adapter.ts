// Adapter de queries — Postgres próprio via PostgREST local (/api/postgrest).

import { PostgrestClient } from "@supabase/postgrest-js";
import type { ClienteDados } from "./tipos";
import type { Database } from "@/integrations/supabase/types";

const URL_API = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/+$/, "");

/** PostgREST exige URL absoluta (new URL() falha com path relativo). */
function resolverUrlPostgrest(): string {
  const caminho = `${URL_API}/postgrest`;
  if (typeof window !== "undefined") {
    return new URL(caminho, window.location.origin).href;
  }
  const origem = (
    process.env.APP_BASE_URL ??
    process.env.VITE_APP_URL ??
    "http://127.0.0.1:3000"
  ).replace(/\/+$/, "");
  return `${origem}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}

let tokenCache: { valor: string; expiraEm: number } | null = null;
let tokenEmVoo: Promise<string | null> | null = null;

function limparCacheToken() {
  tokenCache = null;
}

async function buscarTokenRemoto(): Promise<string | null> {
  try {
    const urlToken =
      typeof window !== "undefined"
        ? new URL(`${URL_API}/auth/token`, window.location.origin).href
        : `${URL_API}/auth/token`;
    const resp = await fetch(urlToken, {
      credentials: "include",
    });
    if (!resp.ok) {
      limparCacheToken();
      return null;
    }
    const j = (await resp.json()) as { token: string; expira_em: number };
    tokenCache = { valor: j.token, expiraEm: j.expira_em * 1000 };
    return j.token;
  } catch {
    limparCacheToken();
    return null;
  }
}

async function obterToken(): Promise<string | null> {
  const agora = Date.now();
  // Renova o token ~2 min antes de expirar
  if (tokenCache && tokenCache.expiraEm > agora + 120_000) {
    return tokenCache.valor;
  }
  if (!tokenEmVoo) {
    tokenEmVoo = buscarTokenRemoto().finally(() => {
      tokenEmVoo = null;
    });
  }
  return tokenEmVoo;
}

/** Chamar após login para evitar latência na primeira consulta. */
export async function preaquecerTokenPostgrest(): Promise<void> {
  await obterToken();
}

let _cliente: PostgrestClient<Database> | null = null;

function getCliente(): PostgrestClient<Database> {
  if (!_cliente) {
    _cliente = new PostgrestClient<Database>(resolverUrlPostgrest(), {
      fetch: async (input, init) => {
        const token = await obterToken();
        const headers = new Headers(init?.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        headers.set("Accept-Profile", "public");
        const resp = await fetch(input, { ...init, headers, credentials: "include" });
        if (resp.status === 401) limparCacheToken();
        return resp;
      },
    });
  }
  return _cliente;
}

export const db: ClienteDados = {
  from: ((...args: Parameters<PostgrestClient<Database>["from"]>) =>
    getCliente().from(...args)) as ClienteDados["from"],
  rpc: ((...args: Parameters<PostgrestClient<Database>["rpc"]>) =>
    getCliente().rpc(...args)) as ClienteDados["rpc"],
};
