// Checklists, templates, respostas, comentários e histórico.
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  checklists,
  checklistTemplates,
  checklistTemplateItens,
  checklistRespostas,
  checklistComentarios,
  checklistHistorico,
} from "@/db/schema";
import {
  exigirMembroWorkspace,
  exigirPapel,
  temPapelWorkspace,
} from "@/db/autorizacao";
import { NaoEncontrado, Proibido, type CtxWs } from "./types";

// ===== TEMPLATES =====
export async function listarTemplates(ctx: CtxWs) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.workspaceId, ctx.workspaceId));
}

export async function criarTemplate(
  ctx: CtxWs,
  input: Omit<typeof checklistTemplates.$inferInsert, "workspaceId" | "criadoPor" | "id">,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  const [r] = await db
    .insert(checklistTemplates)
    .values({ ...input, workspaceId: ctx.workspaceId, criadoPor: ctx.userId })
    .returning();
  return r;
}

export async function atualizarTemplate(
  ctx: CtxWs,
  id: string,
  patch: Partial<typeof checklistTemplates.$inferInsert>,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  const [r] = await db
    .update(checklistTemplates)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(
      and(
        eq(checklistTemplates.id, id),
        eq(checklistTemplates.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();
  return r;
}

export async function excluirTemplate(ctx: CtxWs, id: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(checklistTemplates)
    .where(
      and(
        eq(checklistTemplates.id, id),
        eq(checklistTemplates.workspaceId, ctx.workspaceId),
      ),
    );
}

// ===== ITENS DO TEMPLATE =====
export async function listarItensTemplate(ctx: CtxWs, templateId: string) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(checklistTemplateItens)
    .where(
      and(
        eq(checklistTemplateItens.workspaceId, ctx.workspaceId),
        eq(checklistTemplateItens.templateId, templateId),
      ),
    )
    .orderBy(checklistTemplateItens.ordem);
}

export async function criarItemTemplate(
  ctx: CtxWs,
  input: Omit<typeof checklistTemplateItens.$inferInsert, "workspaceId" | "id">,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  const [r] = await db
    .insert(checklistTemplateItens)
    .values({ ...input, workspaceId: ctx.workspaceId })
    .returning();
  return r;
}

export async function atualizarItemTemplate(
  ctx: CtxWs,
  id: string,
  patch: Partial<typeof checklistTemplateItens.$inferInsert>,
) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  const [r] = await db
    .update(checklistTemplateItens)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(
      and(
        eq(checklistTemplateItens.id, id),
        eq(checklistTemplateItens.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();
  return r;
}

export async function excluirItemTemplate(ctx: CtxWs, id: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(checklistTemplateItens)
    .where(
      and(
        eq(checklistTemplateItens.id, id),
        eq(checklistTemplateItens.workspaceId, ctx.workspaceId),
      ),
    );
}

// ===== CHECKLISTS =====
export async function listarChecklists(ctx: CtxWs) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(checklists)
    .where(eq(checklists.workspaceId, ctx.workspaceId))
    .orderBy(desc(checklists.criadoEm));
}

export async function criarChecklist(
  ctx: CtxWs,
  input: Omit<typeof checklists.$inferInsert, "workspaceId" | "criadoPor" | "id">,
) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  const [r] = await db
    .insert(checklists)
    .values({ ...input, workspaceId: ctx.workspaceId, criadoPor: ctx.userId })
    .returning();
  return r;
}

export async function atualizarChecklist(
  ctx: CtxWs,
  id: string,
  patch: Partial<typeof checklists.$inferInsert>,
) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).workspaceId;
  const [r] = await db
    .update(checklists)
    .set({ ...patch, atualizadoEm: new Date() })
    .where(and(eq(checklists.id, id), eq(checklists.workspaceId, ctx.workspaceId)))
    .returning();
  return r;
}

export async function excluirChecklist(ctx: CtxWs, id: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(checklists)
    .where(and(eq(checklists.id, id), eq(checklists.workspaceId, ctx.workspaceId)));
}

// ===== RESPOSTAS =====
export async function listarRespostas(ctx: CtxWs, checklistId: string) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(checklistRespostas)
    .where(
      and(
        eq(checklistRespostas.workspaceId, ctx.workspaceId),
        eq(checklistRespostas.checklistId, checklistId),
      ),
    );
}

export async function upsertResposta(
  ctx: CtxWs,
  input: Omit<typeof checklistRespostas.$inferInsert, "workspaceId" | "atualizadoPor" | "id">,
) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  // Encontra existente por (checklistId, itemId)
  const [exist] = await db
    .select()
    .from(checklistRespostas)
    .where(
      and(
        eq(checklistRespostas.checklistId, input.checklistId),
        eq(checklistRespostas.itemId, input.itemId),
      ),
    )
    .limit(1);
  if (exist) {
    const [r] = await db
      .update(checklistRespostas)
      .set({ valor: input.valor, atualizadoPor: ctx.userId, atualizadoEm: new Date() })
      .where(eq(checklistRespostas.id, exist.id))
      .returning();
    return r;
  }
  const [r] = await db
    .insert(checklistRespostas)
    .values({ ...input, workspaceId: ctx.workspaceId, atualizadoPor: ctx.userId })
    .returning();
  return r;
}

export async function excluirResposta(ctx: CtxWs, id: string) {
  await exigirPapel(ctx.userId, ctx.workspaceId, ["Proprietario", "Administrador"]);
  await db
    .delete(checklistRespostas)
    .where(
      and(
        eq(checklistRespostas.id, id),
        eq(checklistRespostas.workspaceId, ctx.workspaceId),
      ),
    );
}

// ===== COMENTÁRIOS =====
export async function listarComentariosChecklist(ctx: CtxWs, checklistId: string) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(checklistComentarios)
    .where(
      and(
        eq(checklistComentarios.workspaceId, ctx.workspaceId),
        eq(checklistComentarios.checklistId, checklistId),
      ),
    )
    .orderBy(checklistComentarios.criadoEm);
}

export async function comentarChecklist(
  ctx: CtxWs,
  input: Omit<
    typeof checklistComentarios.$inferInsert,
    "workspaceId" | "autorId" | "id"
  >,
) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  const [r] = await db
    .insert(checklistComentarios)
    .values({ ...input, workspaceId: ctx.workspaceId, autorId: ctx.userId })
    .returning();
  return r;
}

export async function editarComentarioChecklist(
  ctx: CtxWs,
  id: string,
  conteudo: string,
) {
  const [c] = await db
    .select()
    .from(checklistComentarios)
    .where(eq(checklistComentarios.id, id))
    .limit(1);
  if (!c) throw new NaoEncontrado("Comentário");
  if (c.autorId !== ctx.userId) throw new Proibido();
  const [r] = await db
    .update(checklistComentarios)
    .set({ conteudo, atualizadoEm: new Date() })
    .where(eq(checklistComentarios.id, id))
    .returning();
  return r;
}

export async function excluirComentarioChecklist(ctx: CtxWs, id: string) {
  const [c] = await db
    .select()
    .from(checklistComentarios)
    .where(eq(checklistComentarios.id, id))
    .limit(1);
  if (!c) throw new NaoEncontrado("Comentário");
  const isAutor = c.autorId === ctx.userId;
  const isAdmin = await temPapelWorkspace(ctx.userId, ctx.workspaceId, [
    "Proprietario",
    "Administrador",
  ]);
  if (!isAutor && !isAdmin) throw new Proibido();
  await db.delete(checklistComentarios).where(eq(checklistComentarios.id, id));
}

// ===== HISTÓRICO =====
export async function listarHistoricoChecklist(ctx: CtxWs, checklistId: string) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  return db
    .select()
    .from(checklistHistorico)
    .where(
      and(
        eq(checklistHistorico.workspaceId, ctx.workspaceId),
        eq(checklistHistorico.checklistId, checklistId),
      ),
    )
    .orderBy(desc(checklistHistorico.criadoEm));
}

export async function _registrarHistoricoChecklist(
  input: typeof checklistHistorico.$inferInsert,
) {
  await db.insert(checklistHistorico).values(input);
}
