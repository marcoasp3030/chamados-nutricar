-- Corrige enum de cargo: Drizzle criou cargo_membro (TI, Compras…),
-- mas o app/Supabase usa cargo_workspace (Funcionario, Supervisor, Gestor, Gerente).

ALTER TABLE workspace_membros
  ALTER COLUMN cargo TYPE text USING cargo::text;

ALTER TABLE workspace_convites
  ALTER COLUMN cargo TYPE text USING cargo::text;

-- Valores legados do seed → equivalente no app
UPDATE workspace_membros SET cargo = 'Funcionario' WHERE cargo IN ('TI', 'Operacional', 'Outro');
UPDATE workspace_membros SET cargo = 'Gestor' WHERE cargo IN ('Compras', 'Financeiro', 'Comercial');
UPDATE workspace_convites SET cargo = 'Funcionario' WHERE cargo IN ('TI', 'Operacional', 'Outro');
UPDATE workspace_convites SET cargo = 'Gestor' WHERE cargo IN ('Compras', 'Financeiro', 'Comercial');

ALTER TABLE workspace_membros
  ALTER COLUMN cargo TYPE cargo_workspace USING cargo::cargo_workspace;

ALTER TABLE workspace_convites
  ALTER COLUMN cargo TYPE cargo_workspace USING cargo::cargo_workspace;

-- Remove enum legado (nenhuma coluna referencia após migração)
DROP TYPE IF EXISTS cargo_membro;

-- PostgREST mantém cache de tipos em memória: reiniciar após ALTER TYPE
-- docker service update --force chamados_postgrest
