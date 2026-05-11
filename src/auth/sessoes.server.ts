// CRUD de sessões (refresh tokens) na tabela `sessoes`.
import { eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { sessoes, usuarios } from "@/db/schema";
import { gerarRefreshToken, hashRefreshToken, TTL } from "./jwt.server";

export async function criarSessao(input: {
  usuarioId: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ refreshToken: string; sessaoId: string; expiraEm: Date }> {
  const { token, hash } = gerarRefreshToken();
  const expiraEm = new Date(Date.now() + TTL.REFRESH_SEG * 1000);
  const [row] = await db
    .insert(sessoes)
    .values({
      usuarioId: input.usuarioId,
      refreshTokenHash: hash,
      expiraEm,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    })
    .returning({ id: sessoes.id });
  return { refreshToken: token, sessaoId: row.id, expiraEm };
}

export async function rotacionarSessao(refreshTokenAtual: string): Promise<{
  novoRefresh: string;
  usuarioId: string;
  email: string;
  expiraEm: Date;
} | null> {
  const hash = hashRefreshToken(refreshTokenAtual);
  const [sess] = await db
    .select({
      id: sessoes.id,
      usuarioId: sessoes.usuarioId,
      expiraEm: sessoes.expiraEm,
      email: usuarios.email,
    })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(eq(sessoes.refreshTokenHash, hash))
    .limit(1);

  if (!sess) return null;
  if (sess.expiraEm.getTime() < Date.now()) {
    await db.delete(sessoes).where(eq(sessoes.id, sess.id));
    return null;
  }

  // Rotaciona: emite novo refresh e invalida o antigo.
  const { token, hash: novoHash } = gerarRefreshToken();
  const expiraEm = new Date(Date.now() + TTL.REFRESH_SEG * 1000);
  await db
    .update(sessoes)
    .set({ refreshTokenHash: novoHash, expiraEm })
    .where(eq(sessoes.id, sess.id));

  return { novoRefresh: token, usuarioId: sess.usuarioId, email: sess.email, expiraEm };
}

export async function revogarSessao(refreshToken: string): Promise<void> {
  const hash = hashRefreshToken(refreshToken);
  await db.delete(sessoes).where(eq(sessoes.refreshTokenHash, hash));
}

export async function revogarTodasSessoesDoUsuario(usuarioId: string): Promise<void> {
  await db.delete(sessoes).where(eq(sessoes.usuarioId, usuarioId));
}

// Limpeza periódica (chame de um cron / endpoint protegido).
export async function limparSessoesExpiradas(): Promise<number> {
  const r = await db.delete(sessoes).where(lt(sessoes.expiraEm, new Date())).returning({ id: sessoes.id });
  return r.length;
}
