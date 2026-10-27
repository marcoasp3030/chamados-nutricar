-- Snapshot da descrição do chamado pai no subchamado (sem alterar RLS).
-- O dept. destino vê o contexto mesmo sem permissão de ler o chamado pai.

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS descricao_chamado_pai text,
  ADD COLUMN IF NOT EXISTS titulo_chamado_pai text,
  ADD COLUMN IF NOT EXISTS numero_chamado_pai integer,
  ADD COLUMN IF NOT EXISTS codigo_chamado_pai text;

COMMENT ON COLUMN public.chamados.descricao_chamado_pai IS
  'Cópia da descrição do chamado pai no momento do vínculo (subchamado).';

CREATE OR REPLACE FUNCTION public.preencher_contexto_chamado_pai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.chamado_pai_id IS NOT NULL THEN
    SELECT pai.descricao, pai.titulo, pai.numero, pai.codigo
    INTO NEW.descricao_chamado_pai, NEW.titulo_chamado_pai, NEW.numero_chamado_pai, NEW.codigo_chamado_pai
    FROM public.chamados pai
    WHERE pai.id = NEW.chamado_pai_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamado_contexto_pai ON public.chamados;
CREATE TRIGGER trg_chamado_contexto_pai
  BEFORE INSERT ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.preencher_contexto_chamado_pai();

-- Subchamados já existentes
UPDATE public.chamados sub
SET
  descricao_chamado_pai = pai.descricao,
  titulo_chamado_pai = pai.titulo,
  numero_chamado_pai = pai.numero,
  codigo_chamado_pai = pai.codigo
FROM public.chamados pai
WHERE sub.chamado_pai_id = pai.id
  AND (
    sub.descricao_chamado_pai IS DISTINCT FROM pai.descricao
    OR sub.titulo_chamado_pai IS DISTINCT FROM pai.titulo
    OR sub.numero_chamado_pai IS DISTINCT FROM pai.numero
  );
