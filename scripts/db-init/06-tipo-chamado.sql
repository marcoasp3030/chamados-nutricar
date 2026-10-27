-- Corrige enum tipo_chamado: Drizzle criou (Solicitacao, Incidente, Problema, Mudanca),
-- mas o app/Supabase usa (Incidente, Solicitacao, Duvida, Melhoria, Bug).

ALTER TABLE chamados
  ALTER COLUMN tipo DROP DEFAULT;

ALTER TABLE chamados
  ALTER COLUMN tipo TYPE text USING tipo::text;

UPDATE chamados SET tipo = 'Bug' WHERE tipo = 'Problema';
UPDATE chamados SET tipo = 'Melhoria' WHERE tipo = 'Mudanca';

DROP TYPE tipo_chamado;

CREATE TYPE tipo_chamado AS ENUM (
  'Incidente',
  'Solicitacao',
  'Duvida',
  'Melhoria',
  'Bug'
);

ALTER TABLE chamados
  ALTER COLUMN tipo TYPE tipo_chamado USING tipo::tipo_chamado;

ALTER TABLE chamados
  ALTER COLUMN tipo SET DEFAULT 'Solicitacao'::tipo_chamado;

ALTER TABLE chamados
  ALTER COLUMN tipo SET NOT NULL;

-- PostgREST mantém cache de tipos em memória: reiniciar após ALTER TYPE
-- docker service update --force chamados_postgrest
