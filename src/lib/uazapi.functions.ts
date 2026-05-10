import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { registrarLogUazapi, uazapiFetch, normalizeServerUrl } from "./uazapi.server";

async function garantirAdmin(supabase: any, workspaceId: string, userId: string) {
  const { data, error } = await supabase
    .from("workspace_membros")
    .select("papel")
    .eq("workspace_id", workspaceId)
    .eq("usuario_id", userId)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !["Proprietario", "Administrador"].includes(data.papel)) {
    throw new Error("Apenas Proprietário ou Administrador.");
  }
}

async function carregarConfig(workspaceId: string) {
  const { data, error } = await supabaseAdmin
    .from("workspace_uazapi_config")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function extrairQR(data: any): string | null {
  if (!data) return null;
  return (
    data.qrcode ??
    data.qrCode ??
    data.qr ??
    data.instance?.qrcode ??
    data.instance?.qrCode ??
    null
  );
}

function extrairStatus(data: any): string | null {
  if (!data) return null;
  const candidatos = [
    data.status,
    data.connectionStatus,
    data.state,
    data.instance?.status,
    data.instance?.state,
    data.instance?.connectionStatus,
  ];
  for (const c of candidatos) {
    if (typeof c === "string") return c;
    if (c && typeof c === "object") {
      // Ex: { state: "open" }
      if (typeof c.state === "string") return c.state;
      if (typeof c.status === "string") return c.status;
    }
  }
  return null;
}

function extrairNumero(data: any): string | null {
  if (!data) return null;
  const raw =
    data.owner ??
    data.wid ??
    data.number ??
    data.phoneNumber ??
    data.instance?.owner ??
    data.instance?.wid ??
    data.instance?.number ??
    null;
  if (!raw) return null;
  return String(raw).split("@")[0];
}

function statusNormalizado(s: string | null): string {
  if (!s) return "disconnected";
  const v = String(s).toLowerCase();
  if (["connected", "open", "online", "ready"].includes(v)) return "connected";
  if (["connecting", "loading", "syncing"].includes(v)) return "connecting";
  if (["qr", "qrcode", "pairing", "scanning"].some((k) => v.includes(k))) return "qr";
  if (["disconnected", "closed", "logged_out", "logout", "offline"].some((k) => v.includes(k)))
    return "disconnected";
  return v;
}

// Tenta múltiplos endpoints de connect (varia entre versões da Uazapi).
async function chamarConnect(serverUrl: string, instanceName: string, token: string) {
  const tentativas: { method: "POST" | "GET"; path: string; body?: any }[] = [
    { method: "POST", path: "/instance/connect", body: {} },
    { method: "POST", path: `/instance/connect/${instanceName}`, body: {} },
    { method: "POST", path: `/instance/connect?instance=${instanceName}`, body: {} },
    { method: "GET", path: `/instance/connect/${instanceName}` },
    { method: "GET", path: `/instance/connect?instance=${instanceName}` },
  ];
  let ultimo = { ok: false, status: 0, data: null as any, text: "" };
  for (const t of tentativas) {
    const r = await uazapiFetch(serverUrl, t.path, token, {
      method: t.method,
      ...(t.body ? { body: JSON.stringify(t.body) } : {}),
    });
    ultimo = r;
    if (r.ok) return r;
  }
  return ultimo;
}

// ======================== SALVAR + VALIDAR ========================
export const salvarUazapiConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; serverUrl: string; adminToken?: string }) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        serverUrl: z.string().url().min(8).max(500),
        adminToken: z.string().min(4).max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await garantirAdmin(supabase, data.workspaceId, userId);

    const serverUrl = normalizeServerUrl(data.serverUrl);
    let token = data.adminToken;
    if (!token) {
      const cfg = await carregarConfig(data.workspaceId);
      token = cfg?.admin_token ?? undefined;
    }
    if (!token) throw new Error("Informe o Admin Token.");
    // Valida tentando endpoint comum da Uazapi
    const tentativas = ["/instance/all", "/instances", "/status"];
    let validouOk = false;
    let ultimoStatus = 0;
    let ultimaMsg = "";
    for (const p of tentativas) {
      try {
        const r = await uazapiFetch(serverUrl, p, token, { method: "GET" });
        ultimoStatus = r.status;
        if (r.ok || r.status === 404) {
          validouOk = r.status !== 401 && r.status !== 403;
          if (validouOk) break;
        }
        ultimaMsg = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      } catch (e: any) {
        ultimaMsg = e.message;
      }
    }

    if (!validouOk) {
      await registrarLogUazapi(
        data.workspaceId,
        "validar",
        false,
        ultimoStatus,
        `Falha ao validar credenciais: ${ultimaMsg}`,
      );
      throw new Error(
        `Não foi possível conectar ao servidor Uazapi (HTTP ${ultimoStatus || "?"}). Verifique URL e Admin Token.`,
      );
    }

    const { error } = await supabaseAdmin.from("workspace_uazapi_config").upsert(
      {
        workspace_id: data.workspaceId,
        server_url: serverUrl,
        admin_token: token,
        atualizado_por: userId,
        ativo: true,
      },
      { onConflict: "workspace_id" },
    );
    if (error) throw new Error(error.message);

    await registrarLogUazapi(data.workspaceId, "validar", true, ultimoStatus, "Credenciais válidas.");
    return { ok: true };
  });

// ======================== CRIAR INSTÂNCIA ========================
export const criarInstanciaUazapi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; nome?: string }) =>
    z.object({ workspaceId: z.string().uuid(), nome: z.string().min(1).max(80).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await garantirAdmin(supabase, data.workspaceId, userId);
    const cfg = await carregarConfig(data.workspaceId);
    if (!cfg?.server_url || !cfg?.admin_token) throw new Error("Configure Server URL e Admin Token primeiro.");

    const nome = (data.nome || `ws-${data.workspaceId.slice(0, 8)}`).toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const r = await uazapiFetch(cfg.server_url, "/instance/init", cfg.admin_token, {
      method: "POST",
      body: JSON.stringify({ name: nome, instanceName: nome, systemName: nome }),
    });

    if (!r.ok && r.status !== 409) {
      await registrarLogUazapi(data.workspaceId, "criar_instancia", false, r.status, `Erro ao criar instância`, r.data);
      throw new Error(`Falha ao criar instância (HTTP ${r.status}): ${typeof r.data === "string" ? r.data : JSON.stringify(r.data)}`);
    }

    const token =
      r.data?.token ??
      r.data?.instance?.token ??
      r.data?.hash ??
      r.data?.apikey ??
      cfg.admin_token;
    const instanceId = r.data?.instance?.id ?? r.data?.id ?? null;

    const { error } = await supabaseAdmin
      .from("workspace_uazapi_config")
      .update({
        instance_name: nome,
        instance_token: token,
        instance_id: instanceId,
        status: "connecting",
        atualizado_por: userId,
      })
      .eq("workspace_id", data.workspaceId);
    if (error) throw new Error(error.message);

    await registrarLogUazapi(data.workspaceId, "criar_instancia", true, r.status, `Instância "${nome}" criada.`);
    return { ok: true, nome };
  });

// ======================== STATUS / QR ========================
export const obterStatusUazapi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string }) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await garantirAdmin(supabase, data.workspaceId, userId);
    const cfg = await carregarConfig(data.workspaceId);
    if (!cfg) return { configurado: false } as const;
    if (!cfg.instance_name) return { configurado: true, instancia: false } as const;

    const token = cfg.instance_token || cfg.admin_token!;
    const tentativas = [
      `/instance/status?instance=${cfg.instance_name}`,
      `/instance/connectionState/${cfg.instance_name}`,
      `/instance/info`,
      `/status`,
    ];
    let resp: any = null;
    let httpFinal = 0;
    for (const p of tentativas) {
      const r = await uazapiFetch(cfg.server_url!, p, token, { method: "GET" });
      httpFinal = r.status;
      if (r.ok && r.data) {
        resp = r.data;
        break;
      }
    }

    let qr = extrairQR(resp);
    let statusBruto = extrairStatus(resp);
    let numero = extrairNumero(resp);

    // Se ainda não conectado e sem QR, tenta /instance/connect para gerar
    if (statusNormalizado(statusBruto) !== "connected" && !qr) {
      const conn = await uazapiFetch(
        cfg.server_url!,
        `/instance/connect?instance=${cfg.instance_name}`,
        token,
        { method: "GET" },
      );
      if (conn.ok) {
        qr = qr ?? extrairQR(conn.data);
        statusBruto = statusBruto ?? extrairStatus(conn.data);
      }
    }

    const status = statusNormalizado(statusBruto);
    const conectadoAgora = status === "connected";

    const agora = new Date().toISOString();
    const update: {
      status: string;
      qr_code: string | null;
      ultima_sincronizacao: string;
      conectado_em?: string;
      numero_conectado?: string;
    } = {
      status,
      qr_code: conectadoAgora ? null : qr,
      ultima_sincronizacao: agora,
    };
    if (conectadoAgora) {
      if (!cfg.conectado_em) update.conectado_em = agora;
      if (numero) update.numero_conectado = numero;
    }

    await supabaseAdmin.from("workspace_uazapi_config").update(update).eq("workspace_id", data.workspaceId);
    await registrarLogUazapi(data.workspaceId, "status", true, httpFinal, `status=${status}`);

    return {
      configurado: true,
      instancia: true,
      status,
      qr_code: update.qr_code as string | null,
      numero_conectado: numero ?? cfg.numero_conectado,
      conectado_em: cfg.conectado_em,
      instance_name: cfg.instance_name,
      ultima_sincronizacao: update.ultima_sincronizacao,
    } as const;
  });

// ======================== RECONECTAR ========================
export const reconectarUazapi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string }) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await garantirAdmin(supabase, data.workspaceId, userId);
    const cfg = await carregarConfig(data.workspaceId);
    if (!cfg?.instance_name) throw new Error("Crie a instância antes.");
    const token = cfg.instance_token || cfg.admin_token!;
    const r = await uazapiFetch(
      cfg.server_url!,
      `/instance/connect?instance=${cfg.instance_name}`,
      token,
      { method: "GET" },
    );
    const qr = extrairQR(r.data);
    await supabaseAdmin
      .from("workspace_uazapi_config")
      .update({ status: "qr", qr_code: qr ?? null, ultima_sincronizacao: new Date().toISOString() })
      .eq("workspace_id", data.workspaceId);
    await registrarLogUazapi(data.workspaceId, "conectar", r.ok, r.status, "Reconectar solicitado.");
    return { ok: true };
  });

// ======================== DESCONECTAR ========================
export const desconectarUazapi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string }) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await garantirAdmin(supabase, data.workspaceId, userId);
    const cfg = await carregarConfig(data.workspaceId);
    if (!cfg?.instance_name) throw new Error("Sem instância.");
    const token = cfg.instance_token || cfg.admin_token!;
    const r = await uazapiFetch(
      cfg.server_url!,
      `/instance/disconnect?instance=${cfg.instance_name}`,
      token,
      { method: "POST" },
    );
    await supabaseAdmin
      .from("workspace_uazapi_config")
      .update({
        status: "disconnected",
        qr_code: null,
        numero_conectado: null,
        conectado_em: null,
        ultima_sincronizacao: new Date().toISOString(),
      })
      .eq("workspace_id", data.workspaceId);
    await registrarLogUazapi(data.workspaceId, "desconectar", r.ok, r.status, "Desconectado.");
    return { ok: true };
  });

// ======================== ENVIAR MENSAGEM DE TESTE ========================
export const enviarMensagemTesteUazapi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; numero: string; mensagem: string }) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        numero: z.string().trim().min(8).max(20),
        mensagem: z.string().trim().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await garantirAdmin(supabase, data.workspaceId, userId);
    const cfg = await carregarConfig(data.workspaceId);
    if (!cfg?.instance_name) throw new Error("Crie e conecte a instância antes.");
    if (cfg.status !== "connected") throw new Error("WhatsApp não está conectado.");

    const token = cfg.instance_token || cfg.admin_token!;
    const numero = data.numero.replace(/\D/g, "");

    const tentativas: { path: string; body: any }[] = [
      { path: `/send/text`, body: { number: numero, text: data.mensagem } },
      { path: `/message/sendText/${cfg.instance_name}`, body: { number: numero, text: data.mensagem } },
      { path: `/sendMessage/${cfg.instance_name}`, body: { number: numero, body: data.mensagem } },
    ];

    let ultimaResp: any = null;
    let ultimoStatus = 0;
    for (const t of tentativas) {
      const r = await uazapiFetch(cfg.server_url!, t.path, token, {
        method: "POST",
        body: JSON.stringify(t.body),
      });
      ultimaResp = r.data;
      ultimoStatus = r.status;
      if (r.ok) {
        await registrarLogUazapi(
          data.workspaceId,
          "status",
          true,
          r.status,
          `Mensagem de teste enviada para ${numero}.`,
        );
        return { ok: true };
      }
    }
    await registrarLogUazapi(
      data.workspaceId,
      "status",
      false,
      ultimoStatus,
      `Falha ao enviar mensagem de teste`,
      ultimaResp,
    );
    throw new Error(
      `Falha ao enviar mensagem (HTTP ${ultimoStatus}): ${typeof ultimaResp === "string" ? ultimaResp : JSON.stringify(ultimaResp)}`,
    );
  });

// ======================== EXCLUIR INSTÂNCIA ========================
export const excluirInstanciaUazapi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string }) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await garantirAdmin(supabase, data.workspaceId, userId);
    const cfg = await carregarConfig(data.workspaceId);
    if (cfg?.instance_name && cfg.server_url) {
      const token = cfg.instance_token || cfg.admin_token!;
      await uazapiFetch(cfg.server_url, `/instance/delete?instance=${cfg.instance_name}`, token, {
        method: "DELETE",
      });
    }
    await supabaseAdmin
      .from("workspace_uazapi_config")
      .update({
        instance_name: null,
        instance_token: null,
        instance_id: null,
        status: "disconnected",
        qr_code: null,
        numero_conectado: null,
        conectado_em: null,
        ultima_sincronizacao: new Date().toISOString(),
      })
      .eq("workspace_id", data.workspaceId);
    await registrarLogUazapi(data.workspaceId, "excluir", true, 200, "Instância removida.");
    return { ok: true };
  });
