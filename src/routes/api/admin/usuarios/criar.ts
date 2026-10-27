import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { obterSessaoHttp } from "@/auth/login-handlers.server";
import { criarUsuarioDireto } from "@/lib/admin-usuarios.server";
import { Proibido, NaoEncontrado } from "@/repos/types";

const Schema = z.object({
  workspaceId: z.string().uuid(),
  nome: z.string().min(1).max(200),
  email: z.string().email().max(254),
  telefone: z.string().max(40).nullable().optional(),
  papel: z.string().min(1).max(40),
  cargo: z.string().min(1).max(120),
  departamentoIds: z.array(z.string().uuid()).max(50).optional(),
});

function respostaErro(e: unknown): Response {
  if (e instanceof Proibido) {
    return Response.json({ error: e.message }, { status: 403 });
  }
  if (e instanceof NaoEncontrado) {
    return Response.json({ error: e.message }, { status: 404 });
  }
  if (e instanceof Response) {
    return Response.json({ error: "Sem permissão." }, { status: e.status });
  }
  if (e instanceof Error) {
    return Response.json({ error: e.message }, { status: 400 });
  }
  console.error("[admin/usuarios/criar]", e);
  return Response.json({ error: "Erro interno." }, { status: 500 });
}

export const Route = createFileRoute("/api/admin/usuarios/criar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const sessao = await obterSessaoHttp();
          if (!sessao.usuario) {
            return Response.json({ error: "Não autenticado." }, { status: 401 });
          }

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return Response.json({ error: "Corpo inválido." }, { status: 400 });
          }

          const parsed = Schema.safeParse(body);
          if (!parsed.success) {
            return Response.json({ error: "Dados inválidos." }, { status: 400 });
          }

          const resultado = await criarUsuarioDireto(sessao.usuario.id, parsed.data);
          return Response.json({
            usuarioId: resultado.usuarioId,
            email: resultado.email,
            senhaTemporaria: resultado.senhaTemporaria,
          });
        } catch (e) {
          return respostaErro(e);
        }
      },
    },
  },
});
