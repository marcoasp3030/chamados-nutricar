// Helper server-only para listar clientes na VMpay (substitui edge function
// `vmpay-clients`). A chave de API fica em `workspace_vmpay_config`.

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { workspaceVmpayConfig } from "@/db/schema";
import { exigirMembroWorkspace } from "@/db/autorizacao";
import type { ClienteVmpay, LocalVmpay } from "@/tipos/vmpay";

export type { ClienteVmpay, LocalVmpay };

export interface ResultadoVmpay {
  ok: boolean;
  erro?: string;
  fallback?: boolean;
  clientes: ClienteVmpay[];
}

export interface ResultadoLocaisVmpay {
  ok: boolean;
  erro?: string;
  fallback?: boolean;
  locais: LocalVmpay[];
}

async function buscarVmpayJson<T>(
  url: string,
  acumulado: T[],
): Promise<{ ok: true; dados: T[] } | { ok: false; erro: string; fallback?: boolean }> {
  let res: Response | null = null;
  let ultimoErro = "";
  for (let i = 0; i < 3; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.ok) break;
      if (![502, 503, 504, 408, 429].includes(res.status)) break;
      ultimoErro = `HTTP ${res.status}`;
    } catch (e) {
      ultimoErro = (e as Error).message ?? "fetch falhou";
      res = null;
    }
    if (i < 2) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    const erroAmigavel =
      status === 502 || status === 503 || status === 504
        ? "O serviço VMPay está temporariamente indisponível. Tente novamente em alguns instantes."
        : status === 401 || status === 403
          ? "Chave VMPay inválida ou sem permissão."
          : `Não foi possível consultar a VMPay (${ultimoErro || `HTTP ${status}`}).`;
    return { ok: false, erro: erroAmigavel, fallback: acumulado.length > 0 };
  }

  const arr = (await res.json()) as T[];
  if (!Array.isArray(arr)) {
    return { ok: false, erro: "Resposta inválida da VMPay." };
  }
  return { ok: true, dados: arr };
}

async function obterChaveVmpay(workspaceId: string): Promise<string | null> {
  const [cfg] = await db
    .select()
    .from(workspaceVmpayConfig)
    .where(eq(workspaceVmpayConfig.workspaceId, workspaceId))
    .limit(1);
  return cfg?.apiKey ?? null;
}

export async function listarClientesVmpay(
  usuarioId: string,
  workspaceId: string,
): Promise<ResultadoVmpay> {
  await exigirMembroWorkspace(usuarioId, workspaceId);

  const apiKey = await obterChaveVmpay(workspaceId);
  if (!apiKey) {
    return { ok: false, erro: "Nenhuma chave VMPay cadastrada.", clientes: [] };
  }

  const perPage = 200;
  const todos: ClienteVmpay[] = [];
  const maxPages = 50;

  for (let page = 1; page <= maxPages; page++) {
    const url = `https://vmpay.vertitecnologia.com.br/api/v1/clients?access_token=${encodeURIComponent(
      apiKey,
    )}&page=${page}&per_page=${perPage}`;

    const resultado = await buscarVmpayJson<ClienteVmpay>(url, todos);
    if (!resultado.ok) {
      return { ok: false, erro: resultado.erro, fallback: resultado.fallback, clientes: todos };
    }
    const arr = resultado.dados;
    if (arr.length === 0) break;
    for (const c of arr) todos.push({ id: c.id, name: c.name });
    if (arr.length < perPage) break;
  }

  return { ok: true, clientes: todos };
}

export async function listarLocaisVmpay(
  usuarioId: string,
  workspaceId: string,
): Promise<ResultadoLocaisVmpay> {
  await exigirMembroWorkspace(usuarioId, workspaceId);

  const apiKey = await obterChaveVmpay(workspaceId);
  if (!apiKey) {
    return { ok: false, erro: "Nenhuma chave VMPay cadastrada.", locais: [] };
  }

  // Paginação igual à de clients — a API pode retornar tudo de uma vez ou por página.
  const perPage = 200;
  const todos: LocalVmpay[] = [];
  const maxPages = 50;

  for (let page = 1; page <= maxPages; page++) {
    const url = `https://vmpay.vertitecnologia.com.br/api/v1/locations?access_token=${encodeURIComponent(
      apiKey,
    )}&page=${page}&per_page=${perPage}`;

    const resultado = await buscarVmpayJson<LocalVmpay>(url, todos);
    if (!resultado.ok) {
      return {
        ok: false,
        erro: resultado.erro,
        fallback: resultado.fallback,
        locais: todos,
      };
    }
    const arr = resultado.dados;
    if (arr.length === 0) break;
    for (const l of arr) todos.push(l);
    if (arr.length < perPage) break;
  }

  return { ok: true, locais: todos };
}
