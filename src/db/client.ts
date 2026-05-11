// Cliente Postgres centralizado para a versão "VPS" do app.
//
// IMPORTANTE: este arquivo só funciona quando o app rodar em ambiente Node
// (na VPS, com DATABASE_URL configurado). Na preview Lovable atual, que ainda
// usa Supabase + Cloudflare Workers, ele não é importado por nenhum código de
// produção — convive em paralelo até o cutover.
//
// Para usar:
//   import { db } from "@/db/client";
//   const rows = await db.select().from(chamados);

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

// Em runtime Node sem DATABASE_URL, falhar cedo com mensagem clara.
// Em build/SSR no ambiente atual (Cloudflare Workers), este módulo não é
// importado, então não há crash.
function makeClient() {
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Defina no .env antes de iniciar o app na VPS.",
    );
  }
  // max=10 conexões por instância, prepared statements ligados.
  const sql = postgres(url, { max: 10, prepare: true });
  return drizzle(sql, { schema, logger: process.env.NODE_ENV !== "production" });
}

let _db: ReturnType<typeof makeClient> | undefined;

export const db = new Proxy({} as ReturnType<typeof makeClient>, {
  get(_t, prop, receiver) {
    if (!_db) _db = makeClient();
    return Reflect.get(_db, prop, receiver);
  },
});

export { schema };
