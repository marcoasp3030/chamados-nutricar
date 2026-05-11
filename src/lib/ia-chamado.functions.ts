// Server function de IA em chamados (substitui edge function `ia-chamado`).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/auth/middleware.server";
import { executarIaChamado } from "./ia-chamado.server";

const Schema = z.object({
  workspaceId: z.string().uuid(),
  acao: z.enum([
    "resumir",
    "sugerir_resposta",
    "classificar",
    "corrigir_escrita",
  ]),
  chamadoId: z.string().uuid().optional(),
  titulo: z.string().max(500).optional(),
  descricao: z.string().max(20000).optional(),
  texto: z.string().max(20000).optional(),
});

export const acaoIaChamado = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data, context }) => {
    return executarIaChamado(context.userId, data);
  });
