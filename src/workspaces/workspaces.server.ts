// Consultas de workspace no servidor (Drizzle + cookies — sem PostgREST no browser).
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { workspaceMembros, workspaces } from "@/db/schema";
import type { PapelMembro, WorkspaceComPapel } from "@/tipos/workspace";

function mapearLinha(
  row: typeof workspaces.$inferSelect,
  papel: PapelMembro,
): WorkspaceComPapel {
  return {
    id: row.id,
    nome: row.nome,
    slug: row.slug,
    logo_url: row.logoUrl,
    cor_primaria: row.corPrimaria,
    cnpj: row.cnpj,
    plano: row.plano,
    status: row.status,
    limite_usuarios: row.limiteUsuarios,
    limite_chamados_mes: row.limiteChamadosMes,
    fuso_horario: row.fusoHorario,
    proprietario_id: row.proprietarioId,
    criado_em: row.criadoEm.toISOString(),
    papel,
  };
}

export async function listarWorkspacesDoUsuario(
  usuarioId: string,
): Promise<WorkspaceComPapel[]> {
  const rows = await db
    .select({ workspace: workspaces, papel: workspaceMembros.papel })
    .from(workspaceMembros)
    .innerJoin(workspaces, eq(workspaceMembros.workspaceId, workspaces.id))
    .where(and(eq(workspaceMembros.usuarioId, usuarioId), eq(workspaceMembros.ativo, true)));

  return rows.map((r) => mapearLinha(r.workspace, r.papel));
}

export async function buscarWorkspaceDoUsuarioPorSlug(
  usuarioId: string,
  slug: string,
): Promise<WorkspaceComPapel | null> {
  const [row] = await db
    .select({ workspace: workspaces, papel: workspaceMembros.papel })
    .from(workspaceMembros)
    .innerJoin(workspaces, eq(workspaceMembros.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembros.usuarioId, usuarioId),
        eq(workspaceMembros.ativo, true),
        eq(workspaces.slug, slug),
      ),
    )
    .limit(1);

  return row ? mapearLinha(row.workspace, row.papel) : null;
}
