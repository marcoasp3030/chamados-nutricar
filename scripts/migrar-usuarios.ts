// Script para popular `usuarios` a partir dos `perfis` existentes (migração).
// Cada usuário recebe um hash placeholder que força reset de senha no 1º login,
// pois não temos acesso aos hashes do GoTrue/Supabase Auth.
//
// Uso na VPS:
//   bun run scripts/migrar-usuarios.ts
//
// Pré-requisitos:
//   - DATABASE_URL apontando para o Postgres da VPS
//   - dump 02-dados.sql já restaurado (perfis preenchidos)

import { db } from "../src/db/client";
import { usuarios, perfis } from "../src/db/schema";
import { sql } from "drizzle-orm";
import { HASH_MIGRACAO_PENDENTE } from "../src/auth/password.server";

async function main() {
  const todos = await db.select({ id: perfis.id, email: perfis.email }).from(perfis);
  console.log(`Encontrados ${todos.length} perfis para migrar.`);
  let inseridos = 0;
  for (const p of todos) {
    if (!p.email) continue;
    try {
      await db
        .insert(usuarios)
        .values({
          id: p.id,
          email: p.email.toLowerCase().trim(),
          senhaHash: HASH_MIGRACAO_PENDENTE,
          emailVerificado: true,
        })
        .onConflictDoNothing();
      inseridos++;
    } catch (e) {
      console.error(`Falhou para ${p.email}:`, e);
    }
  }
  console.log(`Migrados: ${inseridos}.`);
  console.log(
    "Todos os usuários devem fazer 'Esqueci minha senha' no primeiro acesso.",
  );
  // Para evitar warning de conexão pendurada
  await db.execute(sql`select 1`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
