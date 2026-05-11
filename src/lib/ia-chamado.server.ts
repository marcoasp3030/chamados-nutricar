// Helpers server-only para a ação de IA em chamados.
// Substitui a edge function `ia-chamado`. Lê a config do workspace (chave
// OpenAI) direto do Postgres via Drizzle e chama a API da OpenAI.

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  chamados,
  chamadoComentarios,
  chamadoIaExecucoes,
  workspaceIaConfig,
} from "@/db/schema";
import { exigirMembroWorkspace } from "@/db/autorizacao";
import { NaoEncontrado, Proibido } from "@/repos/types";

export type AcaoIa =
  | "resumir"
  | "sugerir_resposta"
  | "classificar"
  | "corrigir_escrita";

export const PROMPTS_IA: Record<AcaoIa, string> = {
  resumir:
    "Você é um analista de suporte. Resuma o chamado em até 5 bullets curtos em português brasileiro: contexto, problema, ações já tomadas, próximo passo recomendado e impacto. Seja objetivo.",
  sugerir_resposta:
    "Você é um atendente de suporte cordial e profissional. Com base no chamado e no histórico de comentários, redija um rascunho de resposta pública ao solicitante em português brasileiro. Tom acolhedor, claro e direto. Não invente fatos. Termine com uma pergunta ou próximo passo.",
  classificar:
    'Você classifica chamados de suporte. Analise o título e descrição e responda APENAS com um JSON válido no formato: {"prioridade":"Baixa|Media|Alta|Urgente","categoria":"<categoria curta em português>","justificativa":"<frase curta>"}. Sem texto fora do JSON.',
  corrigir_escrita:
    "Você é um revisor de português brasileiro. Corrija ortografia, gramática, pontuação e clareza do texto a seguir, mantendo o sentido, o tom e o formato (quebras de linha, listas) originais. NÃO adicione explicações, comentários, aspas ou markdown. Responda APENAS com o texto corrigido, nada mais.",
};

export interface InputIaChamado {
  workspaceId: string;
  acao: AcaoIa;
  chamadoId?: string;
  titulo?: string;
  descricao?: string;
  texto?: string;
}

async function montarContexto(
  input: InputIaChamado,
): Promise<string> {
  if (input.acao === "classificar") {
    const t = (input.titulo ?? "").trim();
    if (!t) throw new Error("Título é obrigatório para classificar.");
    return `Título: ${t}\n\nDescrição: ${input.descricao || "(sem descrição)"}`;
  }
  if (input.acao === "corrigir_escrita") {
    const txt = (input.texto ?? input.descricao ?? "").trim();
    if (!txt) throw new Error("Texto vazio.");
    return txt;
  }
  if (!input.chamadoId) throw new Error("chamadoId é obrigatório.");
  const [ch] = await db
    .select()
    .from(chamados)
    .where(
      and(
        eq(chamados.id, input.chamadoId),
        eq(chamados.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);
  if (!ch) throw new NaoEncontrado("Chamado");

  const coments = await db
    .select()
    .from(chamadoComentarios)
    .where(eq(chamadoComentarios.chamadoId, input.chamadoId))
    .orderBy(asc(chamadoComentarios.criadoEm))
    .limit(40);

  const linhas =
    coments
      .map(
        (c) =>
          `- [${new Date(c.criadoEm).toLocaleString("pt-BR")}]${
            c.interno ? " (interno)" : ""
          }: ${c.conteudo}`,
      )
      .join("\n") || "(sem comentários)";

  return `Chamado #${ch.numero}
Título: ${ch.titulo}
Tipo: ${ch.tipo} | Prioridade: ${ch.prioridade} | Status: ${ch.status}
Categoria: ${ch.categoria ?? "—"}

Descrição:
${ch.descricao ?? "(sem descrição)"}

Comentários (mais antigos primeiro):
${linhas}`;
}

export async function executarIaChamado(
  usuarioId: string,
  input: InputIaChamado,
): Promise<
  | { tipo: "texto"; resultado: string }
  | { tipo: "json"; resultado: Record<string, string>; bruto: string }
> {
  await exigirMembroWorkspace(usuarioId, input.workspaceId);

  const [cfg] = await db
    .select()
    .from(workspaceIaConfig)
    .where(eq(workspaceIaConfig.workspaceId, input.workspaceId))
    .limit(1);

  if (!cfg || !cfg.ativo || !cfg.openaiApiKey) {
    throw new Proibido(
      "IA não configurada. Peça ao administrador para cadastrar a chave OpenAI em Configurações.",
    );
  }

  const contexto = await montarContexto(input);
  const modelo = cfg.modelo || "gpt-5-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelo,
      messages: [
        { role: "system", content: PROMPTS_IA[input.acao] },
        { role: "user", content: contexto },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    const msg = `Falha na OpenAI (${res.status}). Verifique a chave e o modelo (${modelo}).`;
    if (input.chamadoId) {
      await db.insert(chamadoIaExecucoes).values({
        workspaceId: input.workspaceId,
        chamadoId: input.chamadoId,
        usuarioId,
        acao: input.acao,
        modelo,
        erro: `${msg}\n${txt.slice(0, 1000)}`,
      });
    }
    throw new Error(msg);
  }

  const dados = await res.json();
  const conteudo: string = dados.choices?.[0]?.message?.content ?? "";

  if (input.chamadoId) {
    await db.insert(chamadoIaExecucoes).values({
      workspaceId: input.workspaceId,
      chamadoId: input.chamadoId,
      usuarioId,
      acao: input.acao,
      modelo,
      resultado: conteudo,
    });
  }

  if (input.acao === "classificar") {
    let parsed: Record<string, string> = {};
    try {
      const m = conteudo.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    } catch {
      parsed = {};
    }
    return { tipo: "json", resultado: parsed, bruto: conteudo };
  }

  return { tipo: "texto", resultado: conteudo };
}
