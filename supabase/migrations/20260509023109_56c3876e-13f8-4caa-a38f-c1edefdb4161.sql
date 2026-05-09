ALTER TABLE public.chamado_requisicao_itens
ADD COLUMN IF NOT EXISTS prioridade public.prioridade_chamado NOT NULL DEFAULT 'Media';