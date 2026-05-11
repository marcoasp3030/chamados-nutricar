// Roda no boot do container (Docker). Aplica todas as migrations Drizzle
// pendentes contra DATABASE_URL e sai. Idempotente.
//
// Uso:
//   bun run scripts/migrate.ts
//
// No Dockerfile/entrypoint, encadear antes do start do app:
//   bun run scripts/migrate.ts && node .output/server/index.mjs

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL não definida.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

console.log("[migrate] aplicando migrations…");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("[migrate] OK.");
await sql.end();
process.exit(0);
