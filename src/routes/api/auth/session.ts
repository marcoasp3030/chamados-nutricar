import { createFileRoute } from "@tanstack/react-router";
import { obterSessaoHttp } from "@/auth/login-handlers.server";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const r = await obterSessaoHttp();
          return Response.json(r);
        } catch (e) {
          console.error("[auth/session]", e);
          return Response.json({ usuario: null }, { status: 500 });
        }
      },
    },
  },
});
