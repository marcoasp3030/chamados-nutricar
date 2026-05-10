import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { uazapiFetch, normalizeServerUrl } from "@/lib/uazapi.server";

const PayloadSchema = z.object({
  workspace_id: z.string().uuid(),
  chamado_id: z.string().uuid(),
  evento: z.string().min(1).max(40),
  ator_id: z.string().uuid().nullable().optional(),
  comentario_id: z.string().uuid().nullable().optional(),
  detalhes: z.any().nullable().optional(),
});

const APP_BASE_URL =
  "https://project--98165f9e-498c-4810-868e-07ed8362bbd9.lovable.app";

function fmtDataHora(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return iso;
  }
}

function normalizarTelefone(t?: string | null): string | null {
  if (!t) return null;
  let d = t.replace(/\D/g, "");
  if (d.length < 10) return null;
  // Garante DDI 55
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  // Para celular brasileiro (55 + DDD + número), garantir o 9 após o DDD
  // 12 dígitos => 55 + DDD(2) + 8 dígitos => insere 9
  if (d.length === 12 && d.startsWith("55")) {
    d = `${d.slice(0, 4)}9${d.slice(4)}`;
  }
  return d;
}

function tituloEvento(evento: string): string {
  switch (evento) {
    case "criado": return "🆕 Novo chamado";
    case "status": return "🔄 Status atualizado";
    case "responsavel": return "👤 Novo responsável";
    case "prioridade": return "⚡ Prioridade alterada";
    case "departamento": return "🏢 Departamento alterado";
    case "comentario": return "💬 Novo comentário";
    case "resolvido": return "✅ Chamado resolvido";
    case "pausado": return "⏸️ Chamado pausado";
    case "agendado": return "📅 Chamado agendado";
    case "fechado": return "🔒 Chamado fechado";
    case "cancelado": return "❌ Chamado cancelado";
    default: return "📌 Chamado atualizado";
  }
}

async function montarMensagem(opts: {
  evento: string;
  chamado: any;
  workspaceSlug: string | null;
  responsavelNome: string | null;
  departamentoNome: string | null;
  atorNome: string | null;
  comentarioConteudo?: string | null;
  detalhes?: any;
}): Promise<string> {
  const { evento, chamado, workspaceSlug, responsavelNome, departamentoNome, atorNome, comentarioConteudo, detalhes } = opts;
  const link = workspaceSlug
    ? `${APP_BASE_URL}/w/${workspaceSlug}/chamados/${chamado.numero}`
    : `${APP_BASE_URL}`;

  const linhas = [
    `*${tituloEvento(evento)}*`,
    ``,
    `*Chamado:* #${chamado.numero}${chamado.codigo ? ` (${chamado.codigo})` : ""}`,
    `*Título:* ${chamado.titulo}`,
    `*Status:* ${chamado.status}`,
    `*Prioridade:* ${chamado.prioridade}`,
  ];
  if (departamentoNome) linhas.push(`*Departamento:* ${departamentoNome}`);
  if (responsavelNome) linhas.push(`*Responsável:* ${responsavelNome}`);
  if (atorNome) linhas.push(`*Por:* ${atorNome}`);
  linhas.push(`*Em:* ${fmtDataHora(new Date().toISOString())}`);

  if (evento === "comentario" && comentarioConteudo) {
    linhas.push(``, `_${comentarioConteudo.slice(0, 280)}${comentarioConteudo.length > 280 ? "…" : ""}_`);
  }
  if (detalhes && typeof detalhes === "object") {
    if (detalhes.de !== undefined && detalhes.para !== undefined) {
      linhas.push(``, `${detalhes.de ?? "—"} → *${detalhes.para ?? "—"}*`);
    }
  }

  linhas.push(``, `🔗 ${link}`);
  return linhas.join("\n");
}

async function enviarWhatsapp(cfg: any, numero: string, mensagem: string) {
  const token = cfg.instance_token || cfg.admin_token;
  const tentativas: { path: string; body: any }[] = [
    { path: `/send/text`, body: { number: numero, text: mensagem } },
    { path: `/message/sendText/${cfg.instance_name}`, body: { number: numero, text: mensagem } },
    { path: `/sendMessage/${cfg.instance_name}`, body: { number: numero, body: mensagem } },
  ];
  let melhor: { ok: boolean; status: number; data: any } | null = null;
  for (const t of tentativas) {
    const r = await uazapiFetch(normalizeServerUrl(cfg.server_url), t.path, token, {
      method: "POST",
      body: JSON.stringify(t.body),
    });
    const atual = { ok: r.ok, status: r.status, data: r.data };
    if (r.ok) return atual;
    // Só seguir para o próximo path se o atual indicar "endpoint inexistente" (404/405).
    // Para qualquer outro erro (400, 401, 403, 422, 5xx), retornar imediatamente —
    // é o erro real do Uazapi (ex.: número inválido) e não adianta tentar outros paths.
    if (r.status !== 404 && r.status !== 405) return atual;
    // Guardar o último 404/405 caso nenhum path funcione
    melhor = atual;
  }
  return melhor ?? { ok: false, status: 0, data: null };
}

async function handlePOST(request: Request): Promise<Response> {
  // 1) Verificar segredo
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!provided) return new Response("Unauthorized", { status: 401 });

  const { data: cfgSecret } = await supabaseAdmin
    .from("app_config")
    .select("valor")
    .eq("chave", "whatsapp_notify_secret")
    .maybeSingle();
  const expected = (cfgSecret as any)?.valor;
  if (!expected || provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2) Validar payload
  let parsed;
  try {
    const body = await request.json();
    parsed = PayloadSchema.parse(body);
  } catch (e: any) {
    return new Response(`Bad Request: ${e?.message ?? "invalid"}`, { status: 400 });
  }

  // 3) Carregar config Uazapi
  const { data: uaz } = await supabaseAdmin
    .from("workspace_uazapi_config")
    .select("server_url,admin_token,instance_token,instance_name,status")
    .eq("workspace_id", parsed.workspace_id)
    .maybeSingle();
  if (!uaz || !uaz.server_url || !uaz.instance_name || uaz.status !== "connected") {
    return Response.json({ ok: true, skipped: "whatsapp_not_connected" });
  }

  // 4) Carregar chamado
  const { data: chamado } = await supabaseAdmin
    .from("chamados")
    .select("id,numero,codigo,titulo,status,prioridade,workspace_id,solicitante_id,criado_por,responsavel_id,departamento_id,departamento_origem_id,atualizado_em")
    .eq("id", parsed.chamado_id)
    .maybeSingle();
  if (!chamado) return Response.json({ ok: true, skipped: "chamado_not_found" });

  // 5) Workspace slug
  const { data: ws } = await supabaseAdmin
    .from("workspaces")
    .select("slug")
    .eq("id", chamado.workspace_id)
    .maybeSingle();

  // 6) Comentário (se aplicável)
  let comentarioConteudo: string | null = null;
  if (parsed.comentario_id) {
    const { data: c } = await supabaseAdmin
      .from("chamado_comentarios")
      .select("conteudo,interno")
      .eq("id", parsed.comentario_id)
      .maybeSingle();
    if (c?.interno) {
      return Response.json({ ok: true, skipped: "comentario_interno" });
    }
    comentarioConteudo = c?.conteudo ?? null;
  }

  // 7) Coletar destinatários únicos (perfis com telefone)
  const idsRelacionados = new Set<string>();
  if (chamado.solicitante_id) idsRelacionados.add(chamado.solicitante_id);
  if (chamado.responsavel_id) idsRelacionados.add(chamado.responsavel_id);
  if (chamado.criado_por) idsRelacionados.add(chamado.criado_por);

  // Membros do departamento responsável (e origem)
  const deptIds = [chamado.departamento_id, chamado.departamento_origem_id].filter(Boolean) as string[];
  if (deptIds.length > 0) {
    const { data: membros } = await supabaseAdmin
      .from("workspace_membro_departamentos")
      .select("membro_id, workspace_membros!inner(usuario_id, ativo, workspace_id)")
      .in("departamento_id", deptIds);
    for (const m of membros ?? []) {
      const wm = (m as any).workspace_membros;
      if (wm?.ativo && wm?.workspace_id === chamado.workspace_id && wm.usuario_id) {
        idsRelacionados.add(wm.usuario_id as string);
      }
    }
  }

  // Excluir o ator (não notifica quem fez a ação)
  if (parsed.ator_id) idsRelacionados.delete(parsed.ator_id);

  if (idsRelacionados.size === 0) {
    return Response.json({ ok: true, skipped: "no_recipients" });
  }

  // 8) Buscar perfis com telefone
  const { data: perfis } = await supabaseAdmin
    .from("perfis")
    .select("id,nome,telefone")
    .in("id", Array.from(idsRelacionados));

  // Nome do responsável
  const responsavelPerfil = chamado.responsavel_id
    ? (perfis ?? []).find((p) => p.id === chamado.responsavel_id) ?? null
    : null;

  // Nome do ator (pode não estar na lista)
  let atorNome: string | null = null;
  if (parsed.ator_id) {
    const found = (perfis ?? []).find((p) => p.id === parsed.ator_id);
    if (found) atorNome = found.nome;
    else {
      const { data: ap } = await supabaseAdmin
        .from("perfis")
        .select("nome")
        .eq("id", parsed.ator_id)
        .maybeSingle();
      atorNome = ap?.nome ?? null;
    }
  }

  // Departamento
  let departamentoNome: string | null = null;
  if (chamado.departamento_id) {
    const { data: d } = await supabaseAdmin
      .from("departamentos")
      .select("nome")
      .eq("id", chamado.departamento_id)
      .maybeSingle();
    departamentoNome = d?.nome ?? null;
  }

  const mensagem = await montarMensagem({
    evento: parsed.evento,
    chamado,
    workspaceSlug: ws?.slug ?? null,
    responsavelNome: responsavelPerfil?.nome ?? null,
    departamentoNome,
    atorNome,
    comentarioConteudo,
    detalhes: parsed.detalhes,
  });

  // 9) Para cada destinatário com telefone: dedup + envio
  const versao = chamado.atualizado_em ?? new Date().toISOString();
  const enviados: any[] = [];
  for (const perfil of perfis ?? []) {
    const telefone = normalizarTelefone(perfil.telefone);
    if (!telefone) continue;

    const dedupKey = parsed.comentario_id
      ? `${chamado.id}:${parsed.evento}:${perfil.id}:${parsed.comentario_id}`
      : `${chamado.id}:${parsed.evento}:${perfil.id}:${versao}`;

    // Tenta inserir registro pendente — UNIQUE (dedup_key) impede duplicatas
    const { data: ins, error: insErr } = await supabaseAdmin
      .from("chamado_whatsapp_notificacoes")
      .insert({
        workspace_id: chamado.workspace_id,
        chamado_id: chamado.id,
        evento: parsed.evento,
        destinatario_perfil_id: perfil.id,
        telefone,
        mensagem,
        sucesso: false,
        dedup_key: dedupKey,
      })
      .select("id")
      .maybeSingle();
    if (insErr || !ins) {
      // Provável duplicata — pula
      continue;
    }

    try {
      const r = await enviarWhatsapp(uaz, telefone, mensagem);
      await supabaseAdmin
        .from("chamado_whatsapp_notificacoes")
        .update({
          sucesso: r.ok,
          status_http: r.status,
          erro: r.ok ? null : (typeof r.data === "string" ? r.data.slice(0, 500) : JSON.stringify(r.data ?? "").slice(0, 500)),
        })
        .eq("id", ins.id);
      enviados.push({ perfil_id: perfil.id, telefone, ok: r.ok, status: r.status });
    } catch (e: any) {
      await supabaseAdmin
        .from("chamado_whatsapp_notificacoes")
        .update({ sucesso: false, erro: String(e?.message ?? e).slice(0, 500) })
        .eq("id", ins.id);
      enviados.push({ perfil_id: perfil.id, telefone, ok: false, erro: String(e?.message ?? e) });
    }
  }

  return Response.json({ ok: true, enviados: enviados.length, detalhes: enviados });
}

export const Route = createFileRoute("/api/public/whatsapp-notify")({
  server: {
    handlers: {
      POST: ({ request }) => handlePOST(request),
    },
  },
});
