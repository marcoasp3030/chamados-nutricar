// Server functions de administração de usuários.
// Equivale às edge functions `criar-usuario-direto` e `definir-senha-usuario`.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/auth/middleware.server";
import {
  criarUsuarioDireto as svcCriar,
  definirSenhaUsuario as svcDefinirSenha,
} from "./admin-usuarios.server";

const SchemaCriar = z.object({
  workspaceId: z.string().uuid(),
  nome: z.string().min(1).max(200),
  email: z.string().email().max(254),
  telefone: z.string().max(40).nullable().optional(),
  papel: z.string().min(1).max(40),
  cargo: z.string().min(1).max(120),
  departamentoIds: z.array(z.string().uuid()).max(50).optional(),
});

export const criarUsuarioDireto = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => SchemaCriar.parse(input))
  .handler(async ({ data, context }) => {
    return svcCriar(context.userId, data);
  });

const SchemaSenha = z.object({
  workspaceId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  senha: z.string().min(8).max(128).nullable().optional(),
});

export const definirSenhaUsuario = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => SchemaSenha.parse(input))
  .handler(async ({ data, context }) => {
    return svcDefinirSenha(context.userId, data);
  });
