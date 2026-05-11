// Operações de domínio em `usuarios` + criação de `perfis` 1:1.
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { usuarios, perfis } from "@/db/schema";
import { hashSenha, verificarSenha, HASH_MIGRACAO_PENDENTE } from "./password.server";

export type UsuarioPublico = {
  id: string;
  email: string;
  emailVerificado: boolean;
};

function publico(u: { id: string; email: string; emailVerificado: boolean }): UsuarioPublico {
  return { id: u.id, email: u.email, emailVerificado: u.emailVerificado };
}

export async function buscarPorEmail(email: string) {
  const [u] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email.toLowerCase().trim()))
    .limit(1);
  return u ?? null;
}

export async function buscarPorId(id: string): Promise<UsuarioPublico | null> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  return u ? publico(u) : null;
}

export async function criarUsuario(input: {
  email: string;
  senha: string;
  nome?: string;
}): Promise<UsuarioPublico> {
  const email = input.email.toLowerCase().trim();
  const existente = await buscarPorEmail(email);
  if (existente) {
    throw new Error("E-mail já cadastrado");
  }
  const senhaHash = await hashSenha(input.senha);
  const [novo] = await db
    .insert(usuarios)
    .values({ email, senhaHash, emailVerificado: false })
    .returning();

  // Cria perfil 1:1 (compatibilidade com o resto do app)
  await db
    .insert(perfis)
    .values({ id: novo.id, email, nome: input.nome ?? "" })
    .onConflictDoNothing();

  return publico(novo);
}

export async function autenticar(
  email: string,
  senha: string,
): Promise<UsuarioPublico | { erro: "credenciais" } | { erro: "reset_obrigatorio" }> {
  const u = await buscarPorEmail(email);
  if (!u) return { erro: "credenciais" };
  if (u.senhaHash === HASH_MIGRACAO_PENDENTE) return { erro: "reset_obrigatorio" };
  const ok = await verificarSenha(senha, u.senhaHash);
  if (!ok) return { erro: "credenciais" };
  return publico(u);
}

export async function atualizarSenha(usuarioId: string, novaSenha: string): Promise<void> {
  const senhaHash = await hashSenha(novaSenha);
  await db
    .update(usuarios)
    .set({ senhaHash, atualizadoEm: new Date() })
    .where(eq(usuarios.id, usuarioId));
}
