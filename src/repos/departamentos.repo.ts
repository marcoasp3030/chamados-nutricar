// Departamentos.
// SELECT: membro
// INSERT/UPDATE/DELETE: Proprietario|Administrador
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { departamentos } from "@/db/schema";
import { exigirMembroWorkspace, exigirPapel } from "@/db/autorizacao";
import type { CtxWs } from "./types";

export async function listarDepartamentos(ctx: CtxWs) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(departamentos)
    .where(eq(departamentos.workspaceId, ctx.workspaceId))
    .orderBy(departamentos.nome);
}

export async function criarDepartamento(
  ctx: CtxWs,
  input: Omit<typeof departamentos.$inferInsert, "workspaceId" | "criadoPor" | "id">,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  const [r] = await db
    .insert(departamentos)
    .values({ ...input, workspaceId: ctx.workspaceId, criadoPor: ctx.userId })
    .returning();
  return r;
}

export async function atualizarDepartamento(
  ctx: CtxWs,
  id: string,
  patch: Partial<typeof departamentos.$inferInsert>,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  const [r] = await db
    .update(departamentos)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(and(eq(departamentos.id, id), eq(departamentos.workspaceId, ctx.workspaceId)))
    .returning();
  return r;
}

export async function excluirDepartamento(ctx: CtxWs, id: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(departamentos)
    .where(and(eq(departamentos.id, id), eq(departamentos.workspaceId, ctx.workspaceId)));
}
