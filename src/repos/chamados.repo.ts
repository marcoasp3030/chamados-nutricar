// Repo de chamados — substitui as RLS policies de:
//   chamados, chamado_anexos, chamado_comentarios, chamado_historico,
//   chamado_ia_execucoes, chamado_requisicao_itens, chamado_whatsapp_notificacoes
//
// Regras (espelham o Postgres atual):
//
// SELECT chamados:
//   - membro do workspace E
//   - (Proprietario|Administrador) OU solicitante OU criador OU responsável
//     OU departamento atual/origem ∈ departamentos do usuário
//
// INSERT chamados: membro + criado_por=user + solicitante=user
// UPDATE chamados: membro + (papel operacional OU solicitante (não Fechado/Cancelado)
//                  OU departamento ∈ depts do usuário)
// DELETE chamados: Proprietario|Administrador
//
// Comentários internos: só visíveis a quem tem podeVerTodosChamados.
// Anexos/histórico/IA: visíveis se o usuário pode ver o chamado pai.

import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  chamados,
  chamadoAnexos,
  chamadoComentarios,
  chamadoHistorico,
  chamadoIaExecucoes,
  chamadoRequisicaoItens,
  chamadoWhatsappNotificacoes,
} from "@/db/schema";
import {
  departamentosDoUsuario,
  exigirMembroWorkspace,
  exigirPapel,
  podeVerTodosChamados,
  temPapelWorkspace,
} from "@/db/autorizacao";
import { NaoEncontrado, Proibido, type CtxWs } from "./types";

// ---------- helpers internos ----------

/** Busca chamado garantindo que o usuário tem permissão de SELECT. */
async function carregarChamadoVisivel(ctx: CtxWs, chamadoId: string) {
  const [c] = await db
    .select()
    .from(chamados)
    .where(and(eq(chamados.id, chamadoId), eq(chamados.workspaceId, ctx.workspaceId)))
    .limit(1);
  if (!c) throw new NaoEncontrado("Chamado");

  if (await podeVerTodosChamados(ctx.userId, ctx.workspaceId)) return c;
  if (
    c.solicitanteId === ctx.userId ||
    c.criadoPor === ctx.userId ||
    c.responsavelId === ctx.userId
  )
    return c;
  const depts = await departamentosDoUsuario(ctx.userId, ctx.workspaceId);
  if (
    (c.departamentoId && depts.includes(c.departamentoId)) ||
    (c.departamentoOrigemId && depts.includes(c.departamentoOrigemId))
  )
    return c;
  throw new Proibido();
}

/** Pode editar um chamado (regra do UPDATE). */
async function podeEditarChamado(
  ctx: CtxWs,
  c: { solicitanteId: string; status: string; departamentoId: string | null },
): Promise<boolean> {
  if (
    await temPapelWorkspace(ctx.userId, ctx.workspaceId, [
      "Proprietario",
      "Administrador",
      "Gestor",
      "Atendente",
    ])
  ) {
    return true;
  }
  if (
    c.solicitanteId === ctx.userId &&
    c.status !== "Fechado" &&
    c.status !== "Cancelado"
  )
    return true;
  if (c.departamentoId) {
    const depts = await departamentosDoUsuario(ctx.userId, ctx.workspaceId);
    if (depts.includes(c.departamentoId)) return true;
  }
  return false;
}

// ---------- LIST ----------

export async function listarChamados(
  ctx: CtxWs,
  filtros?: { status?: string; responsavelId?: string },
) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);

  const todos = await podeVerTodosChamados(ctx.userId, ctx.workspaceId);
  const depts = todos ? [] : await departamentosDoUsuario(ctx.userId, ctx.workspaceId);

  const whereParts = [eq(chamados.workspaceId, ctx.workspaceId)];
  if (!todos) {
    const visibilidade = or(
      eq(chamados.solicitanteId, ctx.userId),
      eq(chamados.criadoPor, ctx.userId),
      eq(chamados.responsavelId, ctx.userId),
      depts.length > 0 ? inArray(chamados.departamentoId, depts) : sql`false`,
      depts.length > 0 ? inArray(chamados.departamentoOrigemId, depts) : sql`false`,
    );
    if (visibilidade) whereParts.push(visibilidade);
  }
  if (filtros?.status) whereParts.push(eq(chamados.status, filtros.status as never));
  if (filtros?.responsavelId)
    whereParts.push(eq(chamados.responsavelId, filtros.responsavelId));

  return db
    .select()
    .from(chamados)
    .where(and(...whereParts))
    .orderBy(desc(chamados.criadoEm));
}

export async function obterChamado(ctx: CtxWs, chamadoId: string) {
  return carregarChamadoVisivel(ctx, chamadoId);
}

// ---------- INSERT ----------

export async function criarChamado(
  ctx: CtxWs,
  dados: Omit<
    typeof chamados.$inferInsert,
    "workspaceId" | "criadoPor" | "solicitanteId" | "numero" | "id"
  > & { numero: number },
) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  const [novo] = await db
    .insert(chamados)
    .values({
      ...dados,
      workspaceId: ctx.workspaceId,
      criadoPor: ctx.userId,
      solicitanteId: ctx.userId,
    })
    .returning();
  return novo;
}

// ---------- UPDATE ----------

export async function atualizarChamado(
  ctx: CtxWs,
  chamadoId: string,
  patch: Partial<typeof chamados.$inferInsert>,
) {
  const c = await carregarChamadoVisivel(ctx, chamadoId);
  if (!(await podeEditarChamado(ctx, c))) throw new Proibido();

  // Campos imutáveis
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  delete (patch as Record<string, unknown>).numero;
  delete (patch as Record<string, unknown>).criadoPor;

  const [atualizado] = await db
    .update(chamados)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(eq(chamados.id, chamadoId))
    .returning();
  return atualizado;
}

// ---------- DELETE ----------

export async function excluirChamado(ctx: CtxWs, chamadoId: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(chamados)
    .where(and(eq(chamados.id, chamadoId), eq(chamados.workspaceId, ctx.workspaceId)));
}

// ===========================================================
//                       COMENTÁRIOS
// ===========================================================

export async function listarComentarios(ctx: CtxWs, chamadoId: string) {
  await carregarChamadoVisivel(ctx, chamadoId); // garante visibilidade
  const verTodos = await podeVerTodosChamados(ctx.userId, ctx.workspaceId);
  const where = verTodos
    ? eq(chamadoComentarios.chamadoId, chamadoId)
    : and(
        eq(chamadoComentarios.chamadoId, chamadoId),
        eq(chamadoComentarios.interno, false),
      );
  return db
    .select()
    .from(chamadoComentarios)
    .where(where!)
    .orderBy(chamadoComentarios.criadoEm);
}

export async function adicionarComentario(
  ctx: CtxWs,
  input: { chamadoId: string; conteudo: string; interno?: boolean },
) {
  await carregarChamadoVisivel(ctx, input.chamadoId);
  if (input.interno && !(await podeVerTodosChamados(ctx.userId, ctx.workspaceId))) {
    throw new Proibido("Apenas operacional pode comentar internamente");
  }
  const [novo] = await db
    .insert(chamadoComentarios)
    .values({
      workspaceId: ctx.workspaceId,
      chamadoId: input.chamadoId,
      autorId: ctx.userId,
      conteudo: input.conteudo,
      interno: input.interno ?? false,
    })
    .returning();
  return novo;
}

export async function editarComentario(
  ctx: CtxWs,
  comentarioId: string,
  conteudo: string,
) {
  const [c] = await db
    .select()
    .from(chamadoComentarios)
    .where(eq(chamadoComentarios.id, comentarioId))
    .limit(1);
  if (!c) throw new NaoEncontrado("Comentário");
  if (c.autorId !== ctx.userId) throw new Proibido();
  const [r] = await db
    .update(chamadoComentarios)
    .set({ conteudo, atualizadoEm: new Date() })
    .where(eq(chamadoComentarios.id, comentarioId))
    .returning();
  return r;
}

export async function excluirComentario(ctx: CtxWs, comentarioId: string) {
  const [c] = await db
    .select()
    .from(chamadoComentarios)
    .where(eq(chamadoComentarios.id, comentarioId))
    .limit(1);
  if (!c) throw new NaoEncontrado("Comentário");
  const isAutor = c.autorId === ctx.userId;
  const isAdmin = await temPapelWorkspace(ctx.userId, ctx.workspaceId, [
    "Proprietario",
    "Administrador",
  ]);
  if (!isAutor && !isAdmin) throw new Proibido();
  await db.delete(chamadoComentarios).where(eq(chamadoComentarios.id, comentarioId));
}

// ===========================================================
//                           ANEXOS
// ===========================================================

export async function listarAnexos(ctx: CtxWs, chamadoId: string) {
  await carregarChamadoVisivel(ctx, chamadoId);
  return db
    .select()
    .from(chamadoAnexos)
    .where(eq(chamadoAnexos.chamadoId, chamadoId))
    .orderBy(desc(chamadoAnexos.criadoEm));
}

export async function registrarAnexo(
  ctx: CtxWs,
  input: Omit<typeof chamadoAnexos.$inferInsert, "workspaceId" | "enviadoPor" | "id">,
) {
  await carregarChamadoVisivel(ctx, input.chamadoId);
  const [novo] = await db
    .insert(chamadoAnexos)
    .values({ ...input, workspaceId: ctx.workspaceId, enviadoPor: ctx.userId })
    .returning();
  return novo;
}

export async function excluirAnexo(ctx: CtxWs, anexoId: string) {
  const [a] = await db.select().from(chamadoAnexos).where(eq(chamadoAnexos.id, anexoId)).limit(1);
  if (!a) throw new NaoEncontrado("Anexo");
  const isDono = a.enviadoPor === ctx.userId;
  const isAdmin = await temPapelWorkspace(ctx.userId, ctx.workspaceId, [
    "Proprietario",
    "Administrador",
  ]);
  if (!isDono && !isAdmin) throw new Proibido();
  await db.delete(chamadoAnexos).where(eq(chamadoAnexos.id, anexoId));
  return a; // chamador remove arquivo do storage
}

// ===========================================================
//                        HISTÓRICO
// ===========================================================

export async function listarHistorico(ctx: CtxWs, chamadoId: string) {
  await carregarChamadoVisivel(ctx, chamadoId);
  return db
    .select()
    .from(chamadoHistorico)
    .where(eq(chamadoHistorico.chamadoId, chamadoId))
    .orderBy(desc(chamadoHistorico.criadoEm));
}

/** Inserção interna (sem checagem de auth — chamado por triggers TS). */
export async function _registrarHistorico(input: typeof chamadoHistorico.$inferInsert) {
  await db.insert(chamadoHistorico).values(input);
}

// ===========================================================
//                     EXECUÇÕES DE IA
// ===========================================================

export async function listarExecucoesIa(ctx: CtxWs, chamadoId: string) {
  await carregarChamadoVisivel(ctx, chamadoId);
  return db
    .select()
    .from(chamadoIaExecucoes)
    .where(eq(chamadoIaExecucoes.chamadoId, chamadoId))
    .orderBy(desc(chamadoIaExecucoes.criadoEm));
}

export async function _registrarExecucaoIa(
  input: typeof chamadoIaExecucoes.$inferInsert,
) {
  await db.insert(chamadoIaExecucoes).values(input);
  const { publicarIaExecucao } = await import("@/realtime/publish.server");
  publicarIaExecucao(input.chamadoId, "INSERT", { acao: input.acao });
}

// ===========================================================
//                 ITENS DE REQUISIÇÃO
// ===========================================================

/** Pode editar/criar/excluir itens (= editor da requisição: admin/gestor/atendente, solicitante, criador). */
async function podeEditarRequisicao(
  ctx: CtxWs,
  c: { solicitanteId: string; criadoPor: string },
): Promise<boolean> {
  if (await podeVerTodosChamados(ctx.userId, ctx.workspaceId)) return true;
  return c.solicitanteId === ctx.userId || c.criadoPor === ctx.userId;
}

export async function listarItensRequisicao(ctx: CtxWs, chamadoId: string) {
  await carregarChamadoVisivel(ctx, chamadoId);
  return db
    .select()
    .from(chamadoRequisicaoItens)
    .where(eq(chamadoRequisicaoItens.chamadoId, chamadoId))
    .orderBy(chamadoRequisicaoItens.ordem);
}

export async function adicionarItemRequisicao(
  ctx: CtxWs,
  input: Omit<
    typeof chamadoRequisicaoItens.$inferInsert,
    "workspaceId" | "criadoPor" | "id"
  >,
) {
  const c = await carregarChamadoVisivel(ctx, input.chamadoId);
  if (!(await podeEditarRequisicao(ctx, c))) throw new Proibido();
  const [novo] = await db
    .insert(chamadoRequisicaoItens)
    .values({ ...input, workspaceId: ctx.workspaceId, criadoPor: ctx.userId })
    .returning();
  return novo;
}

export async function atualizarItemRequisicao(
  ctx: CtxWs,
  itemId: string,
  patch: Partial<typeof chamadoRequisicaoItens.$inferInsert>,
) {
  const [item] = await db
    .select()
    .from(chamadoRequisicaoItens)
    .where(eq(chamadoRequisicaoItens.id, itemId))
    .limit(1);
  if (!item) throw new NaoEncontrado("Item");
  const c = await carregarChamadoVisivel(ctx, item.chamadoId);
  if (!(await podeEditarRequisicao(ctx, c))) throw new Proibido();
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  delete (patch as Record<string, unknown>).chamadoId;
  const [r] = await db
    .update(chamadoRequisicaoItens)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(eq(chamadoRequisicaoItens.id, itemId))
    .returning();
  return r;
}

export async function excluirItemRequisicao(ctx: CtxWs, itemId: string) {
  const [item] = await db
    .select()
    .from(chamadoRequisicaoItens)
    .where(eq(chamadoRequisicaoItens.id, itemId))
    .limit(1);
  if (!item) throw new NaoEncontrado("Item");
  const c = await carregarChamadoVisivel(ctx, item.chamadoId);
  if (!(await podeEditarRequisicao(ctx, c))) throw new Proibido();
  await db.delete(chamadoRequisicaoItens).where(eq(chamadoRequisicaoItens.id, itemId));
}

// ===========================================================
//                NOTIFICAÇÕES WHATSAPP (logs)
// ===========================================================

export async function listarLogsWhatsappChamado(ctx: CtxWs, chamadoId: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  return db
    .select()
    .from(chamadoWhatsappNotificacoes)
    .where(eq(chamadoWhatsappNotificacoes.chamadoId, chamadoId))
    .orderBy(desc(chamadoWhatsappNotificacoes.criadoEm));
}

export async function _registrarLogWhatsapp(
  input: typeof chamadoWhatsappNotificacoes.$inferInsert,
) {
  await db
    .insert(chamadoWhatsappNotificacoes)
    .values(input)
    .onConflictDoNothing({ target: chamadoWhatsappNotificacoes.dedupKey });
}
