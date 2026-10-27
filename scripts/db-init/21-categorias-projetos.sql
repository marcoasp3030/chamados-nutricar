-- Categorias fixas do departamento Projetos (idempotente).
DO $$
DECLARE
  _ws record;
  _depto uuid;
  _cat text;
  _criado_por uuid;
  _cats text[] := ARRAY[
    'Solicitação de Projeto Residencial - Novo',
    'Solicitação de Projeto Corporativo - Novo',
    'Solicitação de Projeto Residencial - Retrofit',
    'Solicitação de Projeto corporativo - Retrofit'
  ];
BEGIN
  FOR _ws IN SELECT id, proprietario_id FROM public.workspaces LOOP
    SELECT id INTO _depto
    FROM public.departamentos
    WHERE workspace_id = _ws.id AND lower(trim(nome)) = 'projetos'
    LIMIT 1;

    IF _depto IS NULL THEN
      CONTINUE;
    END IF;

    _criado_por := _ws.proprietario_id;

    FOREACH _cat IN ARRAY _cats LOOP
      INSERT INTO public.categorias_chamado (
        workspace_id, nome, cor, departamento_id, criado_por
      )
      SELECT _ws.id, _cat, '#6366f1', _depto, _criado_por
      WHERE NOT EXISTS (
        SELECT 1 FROM public.categorias_chamado
        WHERE workspace_id = _ws.id AND nome = _cat
      );

      -- Garante vínculo ao departamento Projetos se a categoria já existia sem depto.
      UPDATE public.categorias_chamado
      SET departamento_id = _depto, atualizado_em = now()
      WHERE workspace_id = _ws.id
        AND nome = _cat
        AND (departamento_id IS NULL OR departamento_id <> _depto);
    END LOOP;
  END LOOP;
END $$;
