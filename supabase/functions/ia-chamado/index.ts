// Edge function para ações de IA em chamados usando chave OpenAI configurada por workspace.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Acao = "resumir" | "sugerir_resposta" | "classificar";

interface CorpoRequisicao {
  workspace_id: string;
  acao: Acao;
  chamado_id?: string;
  // para classificar sem chamado existente:
  titulo?: string;
  descricao?: string;
}

const PROMPTS: Record<Acao, string> = {
  resumir:
    "Você é um analista de suporte. Resuma o chamado em até 5 bullets curtos em português brasileiro: contexto, problema, ações já tomadas, próximo passo recomendado e impacto. Seja objetivo.",
  sugerir_resposta:
    "Você é um atendente de suporte cordial e profissional. Com base no chamado e no histórico de comentários, redija um rascunho de resposta pública ao solicitante em português brasileiro. Tom acolhedor, claro e direto. Não invente fatos. Termine com uma pergunta ou próximo passo.",
  classificar:
    "Você classifica chamados de suporte. Analise o título e descrição e responda APENAS com um JSON válido no formato: {\"prioridade\":\"Baixa|Media|Alta|Urgente\",\"categoria\":\"<categoria curta em português>\",\"justificativa\":\"<frase curta>\"}. Sem texto fora do JSON.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autenticado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Cliente como usuário para checar pertencimento ao workspace
    const supaUsuario = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supaUsuario.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Sessão inválida." }, 401);
    }

    const corpo = (await req.json()) as CorpoRequisicao;
    if (!corpo.workspace_id || !corpo.acao) {
      return json({ error: "Parâmetros faltando." }, 400);
    }

    // Verificar pertencimento ao workspace
    const { data: membro } = await supaUsuario
      .from("workspace_membros")
      .select("papel, ativo")
      .eq("workspace_id", corpo.workspace_id)
      .eq("usuario_id", userData.user.id)
      .eq("ativo", true)
      .maybeSingle();

    if (!membro) {
      return json({ error: "Sem acesso a este workspace." }, 403);
    }

    // Buscar configuração de IA do workspace via service role (bypass RLS)
    const supaAdmin = createClient(supabaseUrl, serviceKey);
    const { data: config } = await supaAdmin
      .from("workspace_ia_config")
      .select("openai_api_key, modelo, ativo")
      .eq("workspace_id", corpo.workspace_id)
      .maybeSingle();

    if (!config || !config.ativo || !config.openai_api_key) {
      return json(
        { error: "IA não configurada. Peça ao administrador para cadastrar a chave OpenAI em Configurações." },
        400,
      );
    }

    // Montar contexto conforme ação
    let contextoUsuario = "";

    if (corpo.acao === "classificar") {
      const titulo = corpo.titulo ?? "";
      const descricao = corpo.descricao ?? "";
      if (!titulo.trim()) return json({ error: "Título é obrigatório para classificar." }, 400);
      contextoUsuario = `Título: ${titulo}\n\nDescrição: ${descricao || "(sem descrição)"}`;
    } else {
      if (!corpo.chamado_id) return json({ error: "chamado_id é obrigatório." }, 400);
      const { data: chamado, error: erroCh } = await supaAdmin
        .from("chamados")
        .select("numero, titulo, descricao, status, prioridade, tipo, categoria, criado_em, workspace_id")
        .eq("id", corpo.chamado_id)
        .maybeSingle();
      if (erroCh || !chamado || chamado.workspace_id !== corpo.workspace_id) {
        return json({ error: "Chamado não encontrado." }, 404);
      }

      const { data: comentarios } = await supaAdmin
        .from("chamado_comentarios")
        .select("conteudo, interno, criado_em, autor_id")
        .eq("chamado_id", corpo.chamado_id)
        .order("criado_em", { ascending: true })
        .limit(40);

      const linhasComentarios = (comentarios ?? [])
        .map(
          (c) =>
            `- [${new Date(c.criado_em).toLocaleString("pt-BR")}]${c.interno ? " (interno)" : ""}: ${c.conteudo}`,
        )
        .join("\n") || "(sem comentários)";

      contextoUsuario = `Chamado #${chamado.numero}
Título: ${chamado.titulo}
Tipo: ${chamado.tipo} | Prioridade: ${chamado.prioridade} | Status: ${chamado.status}
Categoria: ${chamado.categoria ?? "—"}

Descrição:
${chamado.descricao ?? "(sem descrição)"}

Comentários (mais antigos primeiro):
${linhasComentarios}`;
    }

    // Chamar OpenAI
    const modelo = config.modelo || "gpt-5-mini";
    const respostaOpenAI = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openai_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: PROMPTS[corpo.acao] },
          { role: "user", content: contextoUsuario },
        ],
      }),
    });

    if (!respostaOpenAI.ok) {
      const erroTxt = await respostaOpenAI.text();
      console.error("Erro OpenAI:", respostaOpenAI.status, erroTxt);
      const msgErro = `Falha na OpenAI (${respostaOpenAI.status}). Verifique a chave e o modelo (${modelo}).`;
      if (corpo.chamado_id) {
        await supaAdmin.from("chamado_ia_execucoes").insert({
          chamado_id: corpo.chamado_id,
          workspace_id: corpo.workspace_id,
          usuario_id: userData.user.id,
          acao: corpo.acao,
          modelo,
          erro: `${msgErro}\n${erroTxt.slice(0, 1000)}`,
        });
      }
      return json({ error: msgErro }, 502);
    }

    const dados = await respostaOpenAI.json();
    const conteudo: string = dados.choices?.[0]?.message?.content ?? "";

    // Registrar histórico (apenas quando há chamado_id)
    if (corpo.chamado_id) {
      await supaAdmin.from("chamado_ia_execucoes").insert({
        chamado_id: corpo.chamado_id,
        workspace_id: corpo.workspace_id,
        usuario_id: userData.user.id,
        acao: corpo.acao,
        modelo,
        resultado: conteudo,
      });
    }

    if (corpo.acao === "classificar") {
      let parsed: { prioridade?: string; categoria?: string; justificativa?: string } = {};
      try {
        const match = conteudo.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : {};
      } catch {
        parsed = {};
      }
      return json({ resultado: parsed, bruto: conteudo });
    }

    return json({ resultado: conteudo });
  } catch (e) {
    console.error("ia-chamado erro:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
