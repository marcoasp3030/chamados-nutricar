import { createFileRoute } from "@tanstack/react-router";
import { obterSessaoHttp } from "@/auth/login-handlers.server";
import {
  buscarWorkspaceDoUsuarioPorSlug,
  listarWorkspacesDoUsuario,
} from "@/workspaces/workspaces.server";

export const Route = createFileRoute("/api/workspaces/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const sessao = await obterSessaoHttp();
          if (!sessao.usuario) {
            return Response.json({ erro: "nao_autenticado" }, { status: 401 });
          }

          const url = new URL(request.url);
          const slug = url.searchParams.get("slug");

          if (slug) {
            const workspace = await buscarWorkspaceDoUsuarioPorSlug(
              sessao.usuario.id,
              slug,
            );
            if (!workspace) {
              return Response.json({ erro: "nao_encontrado" }, { status: 404 });
            }
            return Response.json({ workspace });
          }

          const workspaces = await listarWorkspacesDoUsuario(sessao.usuario.id);
          return Response.json({ workspaces });
        } catch (e) {
          console.error("[workspaces/me]", e);
          return Response.json({ erro: "servidor" }, { status: 500 });
        }
      },
    },
  },
});
