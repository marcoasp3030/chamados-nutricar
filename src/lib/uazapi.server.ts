import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type UazapiAcao =
  | "validar"
  | "criar_instancia"
  | "status"
  | "conectar"
  | "desconectar"
  | "excluir";

export async function registrarLogUazapi(
  workspaceId: string,
  acao: UazapiAcao,
  sucesso: boolean,
  statusHttp: number | null,
  mensagem: string | null,
  detalhes?: unknown,
) {
  try {
    await supabaseAdmin.from("workspace_uazapi_logs").insert({
      workspace_id: workspaceId,
      acao,
      sucesso,
      status_http: statusHttp,
      mensagem,
      detalhes: (detalhes ?? null) as never,
    });
  } catch {
    // best-effort
  }
}

export function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export async function uazapiFetch(
  serverUrl: string,
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  const res = await fetch(`${normalizeServerUrl(serverUrl)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      token,
      admintoken: token,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data, text };
}
