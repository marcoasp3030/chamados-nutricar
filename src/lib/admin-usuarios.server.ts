// Helpers server-only para administração de usuários (substituem as edge
// functions `criar-usuario-direto` e `definir-senha-usuario`).
//
// Toda a autorização é feita via `exigirPapel` (Proprietário/Administrador
// do workspace), que substitui as RLS policies usadas no Supabase.

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  perfis,
  usuarios,
  workspaceMembros,
  workspaceMembroDepartamentos,
} from "@/db/schema";
import { hashSenha } from "@/auth/password.server";
import { temPapelWorkspace } from "@/db/autorizacao";
import { Proibido, NaoEncontrado } from "@/repos/types";

const PAPEIS_GERENCIAR_USUARIOS = [
  "Proprietario",
  "Administrador",
  "Gestor",
] as const;

/** Proprietário, Administrador, Gestor ou super_admin global. */
async function exigirGerenciarUsuarios(
  solicitanteId: string,
  workspaceId: string,
): Promise<void> {
  const [perfil] = await db
    .select({ superAdmin: perfis.superAdmin })
    .from(perfis)
    .where(eq(perfis.id, solicitanteId))
    .limit(1);
  if (perfil?.superAdmin) return;

  const ok = await temPapelWorkspace(solicitanteId, workspaceId, [
    ...PAPEIS_GERENCIAR_USUARIOS,
  ]);
  if (!ok) throw new Proibido("Sem permissão");
}

const ALFABETO_SENHA =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const SIMBOLOS = "!@#$%&*?";

export function gerarSenhaForte(tamanho = 16): string {
  const arr = new Uint8Array(tamanho);
  crypto.getRandomValues(arr);
  let s = "";
  for (const n of arr) s += ALFABETO_SENHA[n % ALFABETO_SENHA.length];
  // Garante variedade mínima
  const r = new Uint8Array(2);
  crypto.getRandomValues(r);
  return s + SIMBOLOS[r[0] % SIMBOLOS.length] + (r[1] % 10);
}

export interface InputCriarUsuarioDireto {
  workspaceId: string;
  nome: string;
  email: string;
  telefone?: string | null;
  papel: string;
  cargo: string;
  departamentoIds?: string[];
}

export async function criarUsuarioDireto(
  solicitanteId: string,
  input: InputCriarUsuarioDireto,
): Promise<{ usuarioId: string; email: string; senhaTemporaria: string }> {
  await exigirGerenciarUsuarios(solicitanteId, input.workspaceId);

  const email = input.email.toLowerCase().trim();
  const senha = gerarSenhaForte();
  const senhaHash = await hashSenha(senha);

  // 1) Cria ou recupera usuário
  let usuarioId: string;
  const [existente] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);

  if (existente) {
    usuarioId = existente.id;
    // Reativa usuário existente e define a nova senha temporária.
    await db
      .update(usuarios)
      .set({ senhaHash, emailVerificado: true, atualizadoEm: new Date() })
      .where(eq(usuarios.id, usuarioId));
  } else {
    const [novo] = await db
      .insert(usuarios)
      .values({ email, senhaHash, emailVerificado: true })
      .returning();
    usuarioId = novo.id;
  }

  // 2) Garante perfil 1:1
  await db
    .insert(perfis)
    .values({
      id: usuarioId,
      nome: input.nome,
      email,
      telefone: input.telefone ?? null,
    })
    .onConflictDoUpdate({
      target: perfis.id,
      set: {
        nome: input.nome,
        email,
        telefone: input.telefone ?? null,
      },
    });

  // 3) Cria/ativa membership
  const deptos = input.departamentoIds ?? [];
  const [membroExistente] = await db
    .select()
    .from(workspaceMembros)
    .where(
      and(
        eq(workspaceMembros.workspaceId, input.workspaceId),
        eq(workspaceMembros.usuarioId, usuarioId),
      ),
    )
    .limit(1);

  let membroId: string;
  if (membroExistente) {
    await db
      .update(workspaceMembros)
      .set({
        ativo: true,
        papel: input.papel as typeof workspaceMembros.$inferInsert.papel,
        cargo: input.cargo as typeof workspaceMembros.$inferInsert.cargo,
        departamentoId: deptos[0] ?? null,
        aceitoEm: new Date(),
      })
      .where(eq(workspaceMembros.id, membroExistente.id));
    membroId = membroExistente.id;
  } else {
    const [novo] = await db
      .insert(workspaceMembros)
      .values({
        workspaceId: input.workspaceId,
        usuarioId,
        papel: input.papel as typeof workspaceMembros.$inferInsert.papel,
        cargo: input.cargo as typeof workspaceMembros.$inferInsert.cargo,
        departamentoId: deptos[0] ?? null,
        ativo: true,
        aceitoEm: new Date(),
        convidadoPor: solicitanteId,
      })
      .returning();
    membroId = novo.id;
  }

  // 4) Sincroniza N:N de departamentos
  await db
    .delete(workspaceMembroDepartamentos)
    .where(eq(workspaceMembroDepartamentos.membroId, membroId));
  if (deptos.length) {
    await db.insert(workspaceMembroDepartamentos).values(
      deptos.map((d) => ({
        workspaceId: input.workspaceId,
        membroId,
        departamentoId: d,
      })),
    );
  }

  return { usuarioId, email, senhaTemporaria: senha };
}

/**
 * Atualiza o e-mail de um usuário (login + perfil). Restrito a Proprietário/
 * Administrador (ou super_admin). Atualiza tanto `usuarios.email` (credencial
 * de login) quanto `perfis.email`, garantindo unicidade.
 */
export async function atualizarEmailUsuario(
  solicitanteId: string,
  input: {
    workspaceId: string;
    usuarioId: string;
    email: string;
  },
): Promise<{ email: string }> {
  // Solicitante precisa ser membro ativo do workspace.
  const [eu] = await db
    .select()
    .from(workspaceMembros)
    .where(
      and(
        eq(workspaceMembros.workspaceId, input.workspaceId),
        eq(workspaceMembros.usuarioId, solicitanteId),
        eq(workspaceMembros.ativo, true),
      ),
    )
    .limit(1);

  const [perfilEu] = await db
    .select({ superAdmin: perfis.superAdmin })
    .from(perfis)
    .where(eq(perfis.id, solicitanteId))
    .limit(1);
  const ehSuperAdmin = perfilEu?.superAdmin === true;

  // Apenas Proprietário/Administrador (ou super_admin) podem trocar e-mail.
  const podeAdministrar =
    ehSuperAdmin ||
    (!!eu && (["Proprietario", "Administrador"] as string[]).includes(eu.papel));
  if (!podeAdministrar) throw new Proibido("Sem permissão para alterar o e-mail");

  // Alvo precisa pertencer ao workspace.
  const [alvo] = await db
    .select()
    .from(workspaceMembros)
    .where(
      and(
        eq(workspaceMembros.workspaceId, input.workspaceId),
        eq(workspaceMembros.usuarioId, input.usuarioId),
      ),
    )
    .limit(1);
  if (!alvo) throw new NaoEncontrado("Usuário não pertence à empresa");

  // O e-mail do Proprietário só pode ser alterado por outro Proprietário/super_admin.
  if (alvo.papel === "Proprietario" && !(ehSuperAdmin || eu?.papel === "Proprietario")) {
    throw new Proibido("Sem permissão para alterar o e-mail do proprietário");
  }

  const email = input.email.toLowerCase().trim();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValido) throw new Error("E-mail inválido");

  // Garante unicidade: nenhum outro usuário pode ter esse e-mail.
  const [conflito] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);
  if (conflito && conflito.id !== input.usuarioId) {
    throw new Error("Já existe um usuário com este e-mail");
  }

  await db
    .update(usuarios)
    .set({ email, emailVerificado: true, atualizadoEm: new Date() })
    .where(eq(usuarios.id, input.usuarioId));

  await db.update(perfis).set({ email }).where(eq(perfis.id, input.usuarioId));

  return { email };
}

export async function definirSenhaUsuario(
  solicitanteId: string,
  input: {
    workspaceId: string;
    usuarioId: string;
    senha?: string | null;
  },
): Promise<{ senha: string }> {
  // Verifica papel do solicitante
  const [eu] = await db
    .select()
    .from(workspaceMembros)
    .where(
      and(
        eq(workspaceMembros.workspaceId, input.workspaceId),
        eq(workspaceMembros.usuarioId, solicitanteId),
        eq(workspaceMembros.ativo, true),
      ),
    )
    .limit(1);
  if (!eu) throw new Proibido("Sem permissão");

  const [perfilEu] = await db
    .select({ superAdmin: perfis.superAdmin })
    .from(perfis)
    .where(eq(perfis.id, solicitanteId))
    .limit(1);

  const ehSuperAdmin = perfilEu?.superAdmin === true;
  const podeGerenciar =
    ehSuperAdmin ||
    (["Proprietario", "Administrador", "Gestor"] as string[]).includes(eu.papel);
  if (!podeGerenciar) throw new Proibido("Sem permissão");

  // Verifica que o alvo pertence ao workspace
  const [alvo] = await db
    .select()
    .from(workspaceMembros)
    .where(
      and(
        eq(workspaceMembros.workspaceId, input.workspaceId),
        eq(workspaceMembros.usuarioId, input.usuarioId),
      ),
    )
    .limit(1);
  if (!alvo) throw new NaoEncontrado("Usuário não pertence à empresa");

  if (alvo.papel === "Proprietario" && eu.papel !== "Proprietario") {
    throw new Proibido("Sem permissão para alterar a senha do proprietário");
  }

  if (input.senha && input.senha.length < 8) {
    throw new Error("Senha deve ter pelo menos 8 caracteres");
  }

  const senha =
    input.senha && input.senha.length >= 8 ? input.senha : gerarSenhaForte();
  const senhaHash = await hashSenha(senha);

  await db
    .update(usuarios)
    .set({ senhaHash, atualizadoEm: new Date() })
    .where(eq(usuarios.id, input.usuarioId));

  return { senha };
}
