// Notificações: cada usuário só vê as próprias.
// INSERT: qualquer membro do workspace (sistema usa para criar para outros).
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { notificacoes } from "@/db/schema";
import { exigirMembroWorkspace } from "@/db/autorizacao";
import { NaoEncontrado, Proibido, type Ctx, type CtxWs } from "./types";

export async function listarMinhasNotificacoes(
  ctx: Ctx,
  filtros?: { naoLidas?: boolean },
) {
  const where = filtros?.naoLidas
    ? and(eq(notificacoes.destinatarioId, ctx.userId), isNull(notificacoes.lidaEm))
    : eq(notificacoes.destinatarioId, ctx.userId);
  return db
    .select()
    .from(notificacoes)
    .where(where!)
    .orderBy(desc(notificacoes.criadoEm))
    .limit(100);
}

export async function marcarComoLida(ctx: Ctx, id: string) {
  const [n] = await db.select().from(notificacoes).where(eq(notificacoes.id, id)).limit(1);
  if (!n) throw new NaoEncontrado("Notificação");
  if (n.destinatarioId !== ctx.userId) throw new Proibido();
  await db
    .update(notificacoes)
    .set({ lidaEm: new Date() })
    .where(eq(notificacoes.id, id));
}

export async function marcarTodasComoLidas(ctx: Ctx) {
  await db
    .update(notificacoes)
    .set({ lidaEm: new Date() })
    .where(and(eq(notificacoes.destinatarioId, ctx.userId), isNull(notificacoes.lidaEm)));
}

export async function excluirNotificacao(ctx: Ctx, id: string) {
  const [n] = await db.select().from(notificacoes).where(eq(notificacoes.id, id)).limit(1);
  if (!n) throw new NaoEncontrado("Notificação");
  if (n.destinatarioId !== ctx.userId) throw new Proibido();
  await db.delete(notificacoes).where(eq(notificacoes.id, id));
}

/** Cria notificação (chamada pelo sistema; valida que o emissor é membro do ws). */
export async function criarNotificacao(
  ctx: CtxWs,
  input: Omit<typeof notificacoes.$inferInsert, "workspaceId" | "atorId" | "id">,
) {
  await exigirMembroWorkspace(ctx.userId, ctx.workspaceId);
  const [r] = await db
    .insert(notificacoes)
    .values({ ...input, workspaceId: ctx.workspaceId, atorId: ctx.userId })
    .returning();
  const { publicarNotificacao } = await import("@/realtime/publish.server");
  publicarNotificacao(ctx.workspaceId, "INSERT", { id: r.id });
  return r;
}
