import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { obterSessaoHttp } from "@/auth/login-handlers.server";
import { atualizarEmailUsuario } from "@/lib/admin-usuarios.server";
import { Proibido, NaoEncontrado } from "@/repos/types";

const Schema = z.object({
  workspaceId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  email: z.string().trim().email().max(255),
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
  console.error("[admin/usuarios/atualizar-email]", e);
  return Response.json({ error: "Erro interno." }, { status: 500 });
}

export const Route = createFileRoute("/api/admin/usuarios/atualizar-email")({
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

          const resultado = await atualizarEmailUsuario(sessao.usuario.id, {
            workspaceId: parsed.data.workspaceId,
            usuarioId: parsed.data.usuarioId,
            email: parsed.data.email,
          });
          return Response.json({ email: resultado.email });
        } catch (e) {
          return respostaErro(e);
        }
      },
    },
  },
});
