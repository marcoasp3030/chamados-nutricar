-- Recria as FKs com ON DELETE CASCADE entre os filhos do checklist e public.checklists.
-- O desenho original (Supabase) tinha ON DELETE CASCADE, mas o schema Drizzle não o
-- recriou na VPS. Sem isso, excluir um checklist deixaria respostas/histórico/comentários
-- órfãos (e o histórico nem tem policy de DELETE). Com o cascade, a exclusão do checklist
-- remove os filhos automaticamente (cascade ignora RLS dos filhos).
-- Idempotente: remove órfãos antes e só cria a FK se ainda não existir.

-- Limpa eventuais órfãos para não bloquear a criação das FKs.
DELETE FROM public.checklist_respostas r
  WHERE NOT EXISTS (SELECT 1 FROM public.checklists c WHERE c.id = r.checklist_id);
DELETE FROM public.checklist_historico h
  WHERE NOT EXISTS (SELECT 1 FROM public.checklists c WHERE c.id = h.checklist_id);
DELETE FROM public.checklist_comentarios cm
  WHERE NOT EXISTS (SELECT 1 FROM public.checklists c WHERE c.id = cm.checklist_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checklist_respostas_checklist_id_fkey'
  ) THEN
    ALTER TABLE public.checklist_respostas
      ADD CONSTRAINT checklist_respostas_checklist_id_fkey
      FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checklist_historico_checklist_id_fkey'
  ) THEN
    ALTER TABLE public.checklist_historico
      ADD CONSTRAINT checklist_historico_checklist_id_fkey
      FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checklist_comentarios_checklist_id_fkey'
  ) THEN
    ALTER TABLE public.checklist_comentarios
      ADD CONSTRAINT checklist_comentarios_checklist_id_fkey
      FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;
  END IF;
END $$;
