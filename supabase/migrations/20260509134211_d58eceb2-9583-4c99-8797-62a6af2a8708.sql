ALTER TABLE public.categorias_chamado
  ADD COLUMN IF NOT EXISTS sla_resposta_horas integer,
  ADD COLUMN IF NOT EXISTS sla_resolucao_horas integer;