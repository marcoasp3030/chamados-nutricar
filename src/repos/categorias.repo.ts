// Categorias de chamado.
// SELECT: membro do workspace
// INSERT/UPDATE/DELETE: Proprietario|Administrador
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categoriasChamado } from "@/db/schema";
import { exigirMembroWorkspace, exigirPapel } from "@/db/autorizacao";
import type { CtxWs } from "./types";

export async function listarCategorias(ctx: CtxWs) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(categoriasChamado)
    .where(eq(categoriasChamado.workspaceId, ctx.workspaceId))
    .orderBy(categoriasChamado.nome);
}

export async function criarCategoria(
  ctx: CtxWs,
  input: Omit<
    typeof categoriasChamado.$inferInsert,
    "workspaceId" | "criadoPor" | "id"
  >,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  const [r] = await db
    .insert(categoriasChamado)
    .values({ ...input, workspaceId: ctx.workspaceId, criadoPor: ctx.userId })
    .returning();
  return r;
}

export async function atualizarCategoria(
  ctx: CtxWs,
  categoriaId: string,
  patch: Partial<typeof categoriasChamado.$inferInsert>,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  const [r] = await db
    .update(categoriasChamado)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(
      and(
        eq(categoriasChamado.id, categoriaId),
        eq(categoriasChamado.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();
  return r;
}

export async function excluirCategoria(ctx: CtxWs, categoriaId: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(categoriasChamado)
    .where(
      and(
        eq(categoriasChamado.id, categoriaId),
        eq(categoriasChamado.workspaceId, ctx.workspaceId),
      ),
    );
}
