// GET /api/health — verificação rápida de app + banco + PostgREST.
import { createFileRoute } from "@tanstack/react-router";
import postgres from "postgres";

const URL_POSTGREST = process.env.POSTGREST_URL ?? "http://chamados_postgrest:3000";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const resultado: Record<string, unknown> = { ok: true };

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
          resultado.ok = false;
          resultado.db = "DATABASE_URL ausente";
        } else {
          try {
            const sql = postgres(dbUrl, { max: 1 });
            await sql`select 1`;
            await sql.end();
            resultado.db = "ok";
          } catch (e) {
            resultado.ok = false;
            resultado.db = e instanceof Error ? e.message : String(e);
          }
        }

        try {
          const r = await fetch(`${URL_POSTGREST.replace(/\/+$/, "")}/`, {
            signal: AbortSignal.timeout(3000),
          });
          resultado.postgrest = r.ok ? "ok" : `http_${r.status}`;
          if (!r.ok) resultado.ok = false;
        } catch (e) {
          resultado.ok = false;
          resultado.postgrest = e instanceof Error ? e.message : "erro";
        }

        return Response.json(resultado, { status: resultado.ok ? 200 : 503 });
      },
    },
  },
});
