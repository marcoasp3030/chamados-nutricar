ALTER TABLE public.categorias_chamado
ADD COLUMN IF NOT EXISTS departamento_id uuid NULL REFERENCES public.departamentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categorias_chamado_departamento_id
ON public.categorias_chamado(departamento_id);