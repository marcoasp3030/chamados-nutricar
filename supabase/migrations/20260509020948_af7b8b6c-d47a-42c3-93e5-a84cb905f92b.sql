-- Adiciona coluna codigo
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS codigo text;

-- Função para calcular sigla a partir do nome do workspace
CREATE OR REPLACE FUNCTION public.calcular_sigla_workspace(_nome text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  palavras text[];
  sigla text := '';
  p text;
BEGIN
  IF _nome IS NULL OR length(trim(_nome)) = 0 THEN
    RETURN 'CH';
  END IF;
  -- Mantém apenas letras e espaços, divide em palavras
  palavras := regexp_split_to_array(trim(regexp_replace(_nome, '[^A-Za-zÀ-ÿ ]', ' ', 'g')), '\s+');
  FOREACH p IN ARRAY palavras LOOP
    IF length(p) > 0 AND length(sigla) < 4 THEN
      sigla := sigla || upper(substr(p, 1, 1));
    END IF;
  END LOOP;
  IF length(sigla) < 2 THEN
    sigla := upper(substr(regexp_replace(_nome, '[^A-Za-z]', '', 'g'), 1, 2));
  END IF;
  IF length(sigla) = 0 THEN
    sigla := 'CH';
  END IF;
  RETURN sigla;
END;
$$;

-- Função do trigger para gerar o código
CREATE OR REPLACE FUNCTION public.gerar_codigo_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nome_ws text;
  sigla text;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT nome INTO nome_ws FROM public.workspaces WHERE id = NEW.workspace_id;
    sigla := public.calcular_sigla_workspace(nome_ws);
    NEW.codigo := sigla || '-' || lpad(NEW.numero::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger que dispara depois de gerar o número (ordem alfabética: trg_chamado_numero < trg_chamado_zz_codigo)
DROP TRIGGER IF EXISTS trg_chamado_zz_codigo ON public.chamados;
CREATE TRIGGER trg_chamado_zz_codigo
BEFORE INSERT ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.gerar_codigo_chamado();

-- Backfill dos chamados existentes
UPDATE public.chamados c
SET codigo = public.calcular_sigla_workspace(w.nome) || '-' || lpad(c.numero::text, 4, '0')
FROM public.workspaces w
WHERE c.workspace_id = w.id AND (c.codigo IS NULL OR c.codigo = '');

-- Índice para busca por código
CREATE UNIQUE INDEX IF NOT EXISTS chamados_workspace_codigo_idx
  ON public.chamados (workspace_id, codigo);