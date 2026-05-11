// Adapter de queries — modo VPS (próprio).
//
// Usa `@supabase/postgrest-js` (sub-pacote já incluído em supabase-js)
// apontando para o PostgREST embutido no stack VPS (configurado no Compose
// da Fase 7). O JWT vem do auth próprio (cookie httpOnly + endpoint
// /api/auth/token que devolve o access token assinado).
//
// Vantagem: a API `.from(...).select().eq().single()` continua idêntica,
// nenhum call site precisa mudar — só o cliente subjacente troca.

import { PostgrestClient } from "@supabase/postgrest-js";
import type { ClienteDados } from "./tipos";
import type { Database } from "@/integrations/supabase/types";

const URL_API = import.meta.env.VITE_API_URL ?? "/api";
const URL_POSTGREST = `${URL_API}/postgrest`;

// Cache simples de token (refresh feito pelo auth próprio).
let tokenCache: { valor: string; expiraEm: number } | null = null;

async function obterToken(): Promise<string | null> {
  const agora = Date.now();
  if (tokenCache && tokenCache.expiraEm > agora + 5_000) {
    return tokenCache.valor;
  }
  try {
    const resp = await fetch(`${URL_API}/auth/token`, {
      credentials: "include",
    });
    if (!resp.ok) return null;
    const j = (await resp.json()) as { token: string; expira_em: number };
    tokenCache = { valor: j.token, expiraEm: j.expira_em * 1000 };
    return j.token;
  } catch {
    return null;
  }
}

const cliente = new PostgrestClient<Database>(URL_POSTGREST, {
  fetch: async (input, init) => {
    const token = await obterToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept-Profile", "public");
    return fetch(input, { ...init, headers, credentials: "include" });
  },
});

export const dados: ClienteDados = {
  from: cliente.from.bind(cliente) as ClienteDados["from"],
  rpc: cliente.rpc.bind(cliente) as ClienteDados["rpc"],
};
