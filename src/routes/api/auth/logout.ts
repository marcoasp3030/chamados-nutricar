import { createFileRoute } from "@tanstack/react-router";
import { executarLogout } from "@/auth/login-handlers.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        await executarLogout();
        return Response.json({ ok: true });
      },
    },
  },
});
