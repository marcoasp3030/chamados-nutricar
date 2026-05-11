// Projetos e tarefas.
// projetos:
//   SELECT membro; INSERT membro+criadoPor=user; UPDATE: papel operacional;
//   DELETE: Proprietario|Administrador.
// tarefas:
//   SELECT membro; INSERT membro+criadoPor=user; UPDATE: papel operacional OU responsavel;
//   DELETE: Proprietario|Administrador|Gestor.
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projetos, tarefas } from "@/db/schema";
import {
  exigirMembroWorkspace,
  exigirPapel,
  temPapelWorkspace,
} from "@/db/autorizacao";
import { NaoEncontrado, Proibido, type CtxWs } from "./types";

// ===== PROJETOS =====
export async function listarProjetos(ctx: CtxWs) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db.select().from(projetos).where(eq(projetos.workspaceId, ctx.workspaceId));
}

export async function criarProjeto(
  ctx: CtxWs,
  input: Omit<typeof projetos.$inferInsert, "workspaceId" | "criadoPor" | "id">,
) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  const [r] = await db
    .insert(projetos)
    .values({ ...input, workspaceId: ctx.workspaceId, criadoPor: ctx.userId })
    .returning();
  return r;
}

export async function atualizarProjeto(
  ctx: CtxWs,
  id: string,
  patch: Partial<typeof projetos.$inferInsert>,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, [
    "Proprietario",
    "Administrador",
    "Gestor",
    "Atendente",
  ]);
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  const [r] = await db
    .update(projetos)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(and(eq(projetos.id, id), eq(projetos.workspaceId, ctx.workspaceId)))
    .returning();
  return r;
}

export async function excluirProjeto(ctx: CtxWs, id: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(projetos)
    .where(and(eq(projetos.id, id), eq(projetos.workspaceId, ctx.workspaceId)));
}

// ===== TAREFAS =====
export async function listarTarefas(ctx: CtxWs, projetoId?: string) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  const where = projetoId
    ? and(eq(tarefas.workspaceId, ctx.workspaceId), eq(tarefas.projetoId, projetoId))
    : eq(tarefas.workspaceId, ctx.workspaceId);
  return db.select().from(tarefas).where(where!).orderBy(tarefas.ordem);
}

export async function criarTarefa(
  ctx: CtxWs,
  input: Omit<typeof tarefas.$inferInsert, "workspaceId" | "criadoPor" | "id">,
) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  const [r] = await db
    .insert(tarefas)
    .values({ ...input, workspaceId: ctx.workspaceId, criadoPor: ctx.userId })
    .returning();
  return r;
}

export async function atualizarTarefa(
  ctx: CtxWs,
  id: string,
  patch: Partial<typeof tarefas.$inferInsert>,
) {
  const [t] = await db.select().from(tarefas).where(eq(tarefas.id, id)).limit(1);
  if (!t || t.workspaceId !== ctx.workspaceId) throw new NaoEncontrado("Tarefa");
  const isOperacional = await temPapelWorkspace(ctx.userId, ctx.workspaceId, [
    "Proprietario",
    "Administrador",
    "Gestor",
    "Atendente",
  ]);
  if (!isOperacional && t.responsavelId !== ctx.userId) throw new Proibido();
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  const [r] = await db
    .update(tarefas)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(eq(tarefas.id, id))
    .returning();
  return r;
}

export async function excluirTarefa(ctx: CtxWs, id: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, [
    "Proprietario",
    "Administrador",
    "Gestor",
  ]);
  await db
    .delete(tarefas)
    .where(and(eq(tarefas.id, id), eq(tarefas.workspaceId, ctx.workspaceId)));
}
