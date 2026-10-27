import { createFileRoute } from "@tanstack/react-router";
import { lerCookieAccess } from "@/auth/cookies.server";
import { verificarAccessToken } from "@/auth/jwt.server";
import { publicarNotificacao } from "@/realtime/publish.server";

export const Route = createFileRoute("/api/notificacoes/sinalizar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const access = lerCookieAccess();
        if (!access) return new Response("Unauthorized", { status: 401 });

        try {
          await verificarAccessToken(access);
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: { workspace_id?: string };
        try {
          body = (await request.json()) as { workspace_id?: string };
        } catch {
          return new Response("JSON inválido", { status: 400 });
        }

        const workspaceId = body.workspace_id?.trim();
        if (!workspaceId) {
          return new Response("workspace_id obrigatório", { status: 400 });
        }

        publicarNotificacao(workspaceId, "INSERT", { origem: "chamado" });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
