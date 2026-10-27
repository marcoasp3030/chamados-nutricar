import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { executarLogin } from "@/auth/login-handlers.server";

const Schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(1).max(128),
});

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, erro: "corpo_invalido" }, { status: 400 });
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ ok: false, erro: "dados_invalidos" }, { status: 400 });
        }
        try {
          const r = await executarLogin(parsed.data.email, parsed.data.senha);
          if (!r.ok) {
            return Response.json(r, { status: 401 });
          }
          return Response.json({ ok: true, usuario: r.usuario });
        } catch (e) {
          console.error("[auth/login]", e);
          return Response.json({ ok: false, erro: "servidor" }, { status: 500 });
        }
      },
    },
  },
});
