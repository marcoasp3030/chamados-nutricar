// Funções de autorização (substituem as RLS policies do Supabase).
//
// Cada função recebe (userId, workspaceId, ...) e devolve true/false.
// Usar SEMPRE no início de cada server function antes de ler/gravar dados.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import {
  workspaceMembros,
  workspaceMembroDepartamentos,
  type papelMembro,
} from "./schema";

type Papel = (typeof papelMembro.enumValues)[number];

/** Retorna true se o usuário é membro ativo do workspace com algum dos papéis informados. */
export async function temPapelWorkspace(
  userId: string,
  workspaceId: string,
  papeis: Papel[],
): Promise<boolean> {
  const rows = await db
    .select({ id: workspaceMembros.id })
    .from(workspaceMembros)
    .where(
      and(
        eq(workspaceMembros.workspaceId, workspaceId),
        eq(workspaceMembros.usuarioId, userId),
        eq(workspaceMembros.ativo, true),
        inArray(workspaceMembros.papel, papeis),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Workspaces dos quais o usuário é membro ativo. */
export async function workspacesDoUsuario(userId: string): Promise<string[]> {
  const rows = await db
    .select({ workspaceId: workspaceMembros.workspaceId })
    .from(workspaceMembros)
    .where(and(eq(workspaceMembros.usuarioId, userId), eq(workspaceMembros.ativo, true)));
  return rows.map((r) => r.workspaceId);
}

/** Departamentos do usuário num workspace. */
export async function departamentosDoUsuario(
  userId: string,
  workspaceId: string,
): Promise<string[]> {
  const rows = await db
    .select({ departamentoId: workspaceMembroDepartamentos.departamentoId })
    .from(workspaceMembroDepartamentos)
    .innerJoin(workspaceMembros, eq(workspaceMembros.id, workspaceMembroDepartamentos.membroId))
    .where(
      and(
        eq(workspaceMembros.workspaceId, workspaceId),
        eq(workspaceMembros.usuarioId, userId),
        eq(workspaceMembros.ativo, true),
      ),
    );
  return rows.map((r) => r.departamentoId);
}

/** Pode ver TODOS os chamados do workspace (papéis "operacionais"). */
export async function podeVerTodosChamados(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  return temPapelWorkspace(userId, workspaceId, [
    "Proprietario",
    "Administrador",
    "Gestor",
    "Atendente",
  ]);
}

/** Atalho: lança erro se o usuário não tem o papel exigido. */
export async function exigirPapel(
  userId: string,
  workspaceId: string,
  papeis: Papel[],
): Promise<void> {
  const ok = await temPapelWorkspace(userId, workspaceId, papeis);
  if (!ok) {
    throw new Response("Forbidden", { status: 403 });
  }
}

/** Atalho: lança erro se o usuário não pertence ao workspace. */
export async function exigirMembroWorkspace(
  userId: string,
  workspaceId: string,
): Promise<void> {
  const wss = await workspacesDoUsuario(userId);
  if (!wss.includes(workspaceId)) {
    throw new Response("Forbidden", { status: 403 });
  }
}
