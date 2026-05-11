// Workspaces, membros, membro_departamentos, convites,
// e configurações por-workspace (IA, VMpay, Uazapi).
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  workspaces,
  workspaceMembros,
  workspaceMembroDepartamentos,
  workspaceConvites,
  workspaceIaConfig,
  workspaceVmpayConfig,
  workspaceUazapiConfig,
  workspaceUazapiLogs,
  perfis,
} from "@/db/schema";
import {
  exigirMembroWorkspace,
  exigirPapel,
  workspacesDoUsuario,
} from "@/db/autorizacao";
import { NaoEncontrado, Proibido, type Ctx, type CtxWs } from "./types";

// ===== WORKSPACES =====
export async function listarMeusWorkspaces(ctx: Ctx) {
  const ids = await workspacesDoUsuario(ctx.userId);
  if (!ids.length) return [];
  return db.select().from(workspaces).where(inArray(workspaces.id, ids));
}

export async function obterWorkspace(ctx: CtxWs) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  const [w] = await db.select().from(workspaces).where(eq(workspaces.id, ctx.workspaceId)).limit(1);
  if (!w) throw new NaoEncontrado("Workspace");
  return w;
}

export async function criarWorkspace(
  ctx: Ctx,
  input: Omit<typeof workspaces.$inferInsert, "proprietarioId" | "id">,
) {
  // O criador vira Proprietario via INSERT em workspace_membros (regra explícita).
  const [w] = await db
    .insert(workspaces)
    .values({ ...input, proprietarioId: ctx.userId })
    .returning();
  await db.insert(workspaceMembros).values({
    workspaceId: w.id,
    usuarioId: ctx.userId,
    papel: "Proprietario",
    aceitoEm: new Date(),
  });
  return w;
}

export async function atualizarWorkspace(
  ctx: CtxWs,
  patch: Partial<typeof workspaces.$inferInsert>,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).proprietarioId;
  const [r] = await db
    .update(workspaces)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(eq(workspaces.id, ctx.workspaceId))
    .returning();
  return r;
}

export async function excluirWorkspace(ctx: CtxWs) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario"]);
  await db.delete(workspaces).where(eq(workspaces.id, ctx.workspaceId));
}

// ===== MEMBROS =====
export async function listarMembros(ctx: CtxWs) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(workspaceMembros)
    .where(eq(workspaceMembros.workspaceId, ctx.workspaceId));
}

export async function adicionarMembro(
  ctx: CtxWs,
  input: Omit<typeof workspaceMembros.$inferInsert, "workspaceId" | "id">,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  const [r] = await db
    .insert(workspaceMembros)
    .values({ ...input, workspaceId: ctx.workspaceId })
    .returning();
  return r;
}

export async function atualizarMembro(
  ctx: CtxWs,
  membroId: string,
  patch: Partial<typeof workspaceMembros.$inferInsert>,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  const [r] = await db
    .update(workspaceMembros)
    .set(patch)
    .where(
      and(
        eq(workspaceMembros.id, membroId),
        eq(workspaceMembros.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();
  return r;
}

export async function removerMembro(ctx: CtxWs, membroId: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(workspaceMembros)
    .where(
      and(
        eq(workspaceMembros.id, membroId),
        eq(workspaceMembros.workspaceId, ctx.workspaceId),
      ),
    );
}

// ===== MEMBRO ↔ DEPARTAMENTOS =====
export async function listarDeptosDoMembro(ctx: CtxWs, membroId: string) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(workspaceMembroDepartamentos)
    .where(
      and(
        eq(workspaceMembroDepartamentos.workspaceId, ctx.workspaceId),
        eq(workspaceMembroDepartamentos.membroId, membroId),
      ),
    );
}

export async function setDeptosDoMembro(
  ctx: CtxWs,
  membroId: string,
  departamentoIds: string[],
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(workspaceMembroDepartamentos)
    .where(
      and(
        eq(workspaceMembroDepartamentos.workspaceId, ctx.workspaceId),
        eq(workspaceMembroDepartamentos.membroId, membroId),
      ),
    );
  if (departamentoIds.length) {
    await db.insert(workspaceMembroDepartamentos).values(
      departamentoIds.map((d) => ({
        workspaceId: ctx.workspaceId,
        membroId,
        departamentoId: d,
      })),
    );
  }
}

// ===== CONVITES =====
export async function listarConvites(ctx: CtxWs) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  return db
    .select()
    .from(workspaceConvites)
    .where(eq(workspaceConvites.workspaceId, ctx.workspaceId))
    .orderBy(desc(workspaceConvites.criadoEm));
}

export async function meusConvitesPendentes(ctx: Ctx) {
  const [meu] = await db.select().from(perfis).where(eq(perfis.id, ctx.userId)).limit(1);
  if (!meu) return [];
  return db
    .select()
    .from(workspaceConvites)
    .where(
      and(eq(workspaceConvites.email, meu.email), eq(workspaceConvites.aceito, false)),
    );
}

export async function criarConvite(
  ctx: CtxWs,
  input: Omit<
    typeof workspaceConvites.$inferInsert,
    "workspaceId" | "convidadoPor" | "id" | "token" | "expiraEm"
  >,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  const [r] = await db
    .insert(workspaceConvites)
    .values({
      ...input,
      workspaceId: ctx.workspaceId,
      convidadoPor: ctx.userId,
      expiraEm: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    })
    .returning();
  return r;
}

export async function aceitarConvite(ctx: Ctx, token: string) {
  const [conv] = await db
    .select()
    .from(workspaceConvites)
    .where(eq(workspaceConvites.token, token))
    .limit(1);
  if (!conv) throw new NaoEncontrado("Convite");
  if (conv.aceito) throw new Proibido("Convite já utilizado");
  if (conv.expiraEm.getTime() < Date.now()) throw new Proibido("Convite expirado");
  const [meu] = await db.select().from(perfis).where(eq(perfis.id, ctx.userId)).limit(1);
  if (!meu || meu.email !== conv.email) throw new Proibido();
  await db.transaction(async (trx) => {
    await trx.insert(workspaceMembros).values({
      workspaceId: conv.workspaceId,
      usuarioId: ctx.userId,
      papel: conv.papel,
      cargo: conv.cargo,
      departamentoId: conv.departamentoId,
      convidadoPor: conv.convidadoPor,
      aceitoEm: new Date(),
    });
    await trx
      .update(workspaceConvites)
      .set({ aceito: true })
      .where(eq(workspaceConvites.id, conv.id));
  });
}

export async function excluirConvite(ctx: CtxWs, id: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(workspaceConvites)
    .where(
      and(
        eq(workspaceConvites.id, id),
        eq(workspaceConvites.workspaceId, ctx.workspaceId),
      ),
    );
}

// ===== CONFIGS DE INTEGRAÇÃO =====
async function exigirAdmin(ctx: CtxWs) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
}

export async function obterConfigIa(ctx: CtxWs) {
  await exigirAdmin(ctx);
  const [r] = await db
    .select()
    .from(workspaceIaConfig)
    .where(eq(workspaceIaConfig.workspaceId, ctx.workspaceId))
    .limit(1);
  return r ?? null;
}

export async function salvarConfigIa(
  ctx: CtxWs,
  patch: Partial<typeof workspaceIaConfig.$inferInsert>,
) {
  await exigirAdmin(ctx);
  const valores = {
    workspaceId: ctx.workspaceId,
    atualizadoPor: ctx.userId,
    ...patch,
  };
  const [r] = await db
    .insert(workspaceIaConfig)
    .values(valores)
    .onConflictDoUpdate({
      target: workspaceIaConfig.workspaceId,
      set: { ...patch, atualizadoPor: ctx.userId, atualizadoEm: new Date() },
    })
    .returning();
  return r;
}

export async function obterConfigVmpay(ctx: CtxWs) {
  await exigirAdmin(ctx);
  const [r] = await db
    .select()
    .from(workspaceVmpayConfig)
    .where(eq(workspaceVmpayConfig.workspaceId, ctx.workspaceId))
    .limit(1);
  return r ?? null;
}

export async function salvarConfigVmpay(
  ctx: CtxWs,
  patch: Partial<typeof workspaceVmpayConfig.$inferInsert>,
) {
  await exigirAdmin(ctx);
  const [r] = await db
    .insert(workspaceVmpayConfig)
    .values({ workspaceId: ctx.workspaceId, atualizadoPor: ctx.userId, ...patch })
    .onConflictDoUpdate({
      target: workspaceVmpayConfig.workspaceId,
      set: { ...patch, atualizadoPor: ctx.userId, atualizadoEm: new Date() },
    })
    .returning();
  return r;
}

export async function obterConfigUazapi(ctx: CtxWs) {
  await exigirAdmin(ctx);
  const [r] = await db
    .select()
    .from(workspaceUazapiConfig)
    .where(eq(workspaceUazapiConfig.workspaceId, ctx.workspaceId))
    .limit(1);
  return r ?? null;
}

export async function salvarConfigUazapi(
  ctx: CtxWs,
  patch: Partial<typeof workspaceUazapiConfig.$inferInsert>,
) {
  await exigirAdmin(ctx);
  const [r] = await db
    .insert(workspaceUazapiConfig)
    .values({ workspaceId: ctx.workspaceId, atualizadoPor: ctx.userId, ...patch })
    .onConflictDoUpdate({
      target: workspaceUazapiConfig.workspaceId,
      set: { ...patch, atualizadoPor: ctx.userId, atualizadoEm: new Date() },
    })
    .returning();
  return r;
}

export async function listarLogsUazapi(ctx: CtxWs) {
  await exigirAdmin(ctx);
  return db
    .select()
    .from(workspaceUazapiLogs)
    .where(eq(workspaceUazapiLogs.workspaceId, ctx.workspaceId))
    .orderBy(desc(workspaceUazapiLogs.criadoEm))
    .limit(200);
}

export async function _registrarLogUazapi(
  input: typeof workspaceUazapiLogs.$inferInsert,
) {
  await db.insert(workspaceUazapiLogs).values(input);
}
