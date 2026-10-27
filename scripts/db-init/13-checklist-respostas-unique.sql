-- Restaura a unicidade (checklist_id, item_id) em checklist_respostas.
-- A migration original do Supabase tinha UNIQUE(checklist_id, item_id), mas o
-- schema Drizzle não recriou, quebrando o upsert (ON CONFLICT) ao salvar respostas:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification".
-- Idempotente: usa IF NOT EXISTS. Não há duplicatas esperadas (cada item tem 1 resposta).

CREATE UNIQUE INDEX IF NOT EXISTS idx_cr_checklist_item
  ON public.checklist_respostas (checklist_id, item_id);
