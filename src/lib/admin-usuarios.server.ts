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
import { exigirPapel } from "@/db/autorizacao";
import { Proibido, NaoEncontrado } from "@/repos/types";

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
  await exigirPapel(solicitanteId, input.workspaceId, [
    "Proprietario",
    "Administrador",
  ]);

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
    // Reaproveita usuário existente; não sobrescreve senha automaticamente.
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
        papel: input.papel,
        cargo: input.cargo,
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
        papel: input.papel,
        cargo: input.cargo,
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
  if (!eu || !["Proprietario", "Administrador"].includes(eu.papel)) {
    throw new Proibido("Sem permissão");
  }

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
