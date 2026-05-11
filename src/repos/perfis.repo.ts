// Perfis: SELECT próprio + colegas dos workspaces; UPDATE próprio + admins do mesmo ws.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { perfis, workspaceMembros } from "@/db/schema";
import {
  temPapelWorkspace,
  workspacesDoUsuario,
} from "@/db/autorizacao";
import { NaoEncontrado, Proibido, type Ctx } from "./types";

/** Meu perfil. */
export async function meuPerfil(ctx: Ctx) {
  const [p] = await db.select().from(perfis).where(eq(perfis.id, ctx.userId)).limit(1);
  if (!p) throw new NaoEncontrado("Perfil");
  return p;
}

/** Perfis dos colegas (todos os membros dos meus workspaces). */
export async function listarColegas(ctx: Ctx) {
  const wss = await workspacesDoUsuario(ctx.userId);
  if (!wss.length) return [];
  const membros = await db
    .select({ usuarioId: workspaceMembros.usuarioId })
    .from(workspaceMembros)
    .where(inArray(workspaceMembros.workspaceId, wss));
  const ids = [...new Set(membros.map((m) => m.usuarioId))];
  if (!ids.length) return [];
  return db.select().from(perfis).where(inArray(perfis.id, ids));
}

/** Atualiza meu perfil. */
export async function atualizarMeuPerfil(
  ctx: Ctx,
  patch: Partial<typeof perfis.$inferInsert>,
) {
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).superAdmin;
  const [r] = await db
    .update(perfis)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(eq(perfis.id, ctx.userId))
    .returning();
  return r;
}

/** Admin de algum workspace pode atualizar perfil de membros do MESMO workspace. */
export async function atualizarPerfilDeOutro(
  ctx: Ctx,
  alvoId: string,
  patch: Partial<typeof perfis.$inferInsert>,
) {
  // Descobre algum workspace em comum onde o caller seja Proprietario/Administrador
  const meusWs = await workspacesDoUsuario(ctx.userId);
  const wsAlvoRows = await db
    .select({ workspaceId: workspaceMembros.workspaceId })
    .from(workspaceMembros)
    .where(eq(workspaceMembros.usuarioId, alvoId));
  const wsComuns = wsAlvoRows
    .map((r) => r.workspaceId)
    .filter((w) => meusWs.includes(w));
  let autorizado = false;
  for (const ws of wsComuns) {
    if (
      await temPapelWorkspace(ctx.userId, ws, ["Proprietario", "Administrador"])
    ) {
      autorizado = true;
      break;
    }
  }
  if (!autorizado) throw new Proibido();
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).superAdmin;
  const [r] = await db
    .update(perfis)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(eq(perfis.id, alvoId))
    .returning();
  return r;
}
