ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS departamento_id uuid;
CREATE INDEX IF NOT EXISTS idx_chamados_departamento ON public.chamados(departamento_id);