-- Notificações automáticas de chamados: criação, atualizações, comentários e anexos.
-- Destinatários: solicitante, responsável, membros do dept. destino e origem.
-- Idempotente.

CREATE OR REPLACE FUNCTION public.usuarios_do_departamento(
  _workspace_id uuid,
  _departamento_id uuid
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT wm.usuario_id
  FROM public.workspace_membro_departamentos wmd
  JOIN public.workspace_membros wm ON wm.id = wmd.membro_id
  WHERE wm.workspace_id = _workspace_id
    AND wm.ativo = true
    AND wmd.departamento_id = _departamento_id;
$$;

GRANT EXECUTE ON FUNCTION public.usuarios_do_departamento(uuid, uuid)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.destinatarios_notificacao_chamado(
  _c public.chamados,
  _excluir uuid
)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF _c.solicitante_id IS NOT NULL AND _c.solicitante_id IS DISTINCT FROM _excluir THEN
    RETURN NEXT _c.solicitante_id;
  END IF;

  IF _c.responsavel_id IS NOT NULL AND _c.responsavel_id IS DISTINCT FROM _excluir THEN
    RETURN NEXT _c.responsavel_id;
  END IF;

  IF _c.departamento_id IS NOT NULL THEN
    FOR _uid IN
      SELECT public.usuarios_do_departamento(_c.workspace_id, _c.departamento_id)
    LOOP
      IF _uid IS DISTINCT FROM _excluir THEN
        RETURN NEXT _uid;
      END IF;
    END LOOP;
  END IF;

  IF _c.departamento_origem_id IS NOT NULL
     AND _c.departamento_origem_id IS DISTINCT FROM _c.departamento_id THEN
    FOR _uid IN
      SELECT public.usuarios_do_departamento(_c.workspace_id, _c.departamento_origem_id)
    LOOP
      IF _uid IS DISTINCT FROM _excluir THEN
        RETURN NEXT _uid;
      END IF;
    END LOOP;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.destinatarios_notificacao_chamado(public.chamados, uuid)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.link_chamado_notificacao(
  _workspace_id uuid,
  _numero integer
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT '/w/' || w.slug || '/chamados/' || _numero::text
  FROM public.workspaces w
  WHERE w.id = _workspace_id;
$$;

CREATE OR REPLACE FUNCTION public.inserir_notificacoes_chamado(
  _workspace_id uuid,
  _ator_id uuid,
  _tipo text,
  _titulo text,
  _mensagem text,
  _link text,
  _recurso_id uuid,
  _chamado public.chamados
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dest uuid;
BEGIN
  FOR _dest IN
    SELECT DISTINCT d
    FROM public.destinatarios_notificacao_chamado(_chamado, _ator_id) AS d
  LOOP
    INSERT INTO public.notificacoes (
      workspace_id,
      destinatario_id,
      ator_id,
      tipo,
      titulo,
      mensagem,
      link,
      recurso_tipo,
      recurso_id
    ) VALUES (
      _workspace_id,
      _dest,
      _ator_id,
      _tipo,
      _titulo,
      _mensagem,
      _link,
      'chamado',
      _recurso_id
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_chamado_criado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ator_nome text;
  _depto_dest text;
  _depto_orig text;
  _codigo text;
  _link text;
BEGIN
  SELECT nome INTO _ator_nome FROM public.perfis WHERE id = auth.uid();
  SELECT nome INTO _depto_dest FROM public.departamentos WHERE id = NEW.departamento_id;
  SELECT nome INTO _depto_orig FROM public.departamentos WHERE id = NEW.departamento_origem_id;

  _codigo := COALESCE(NEW.codigo, '#' || NEW.numero::text);
  _link := public.link_chamado_notificacao(NEW.workspace_id, NEW.numero);

  PERFORM public.inserir_notificacoes_chamado(
    NEW.workspace_id,
    auth.uid(),
    'chamado_criado',
    'Novo chamado ' || _codigo,
    COALESCE(_ator_nome, 'Alguém')
      || ' abriu o chamado "' || left(NEW.titulo, 80) || '"'
      || CASE
           WHEN _depto_dest IS NOT NULL THEN ' para ' || _depto_dest
           ELSE ''
         END
      || CASE
           WHEN _depto_orig IS NOT NULL
                AND _depto_orig IS DISTINCT FROM _depto_dest
             THEN ' (origem: ' || _depto_orig || ')'
           ELSE ''
         END,
    _link,
    NEW.id,
    NEW
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_chamado_atualizado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ator_nome text;
  _codigo text;
  _link text;
  _resp_nome text;
BEGIN
  IF NEW IS NOT DISTINCT FROM OLD THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO _ator_nome FROM public.perfis WHERE id = auth.uid();
  _codigo := COALESCE(NEW.codigo, '#' || NEW.numero::text);
  _link := public.link_chamado_notificacao(NEW.workspace_id, NEW.numero);

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.inserir_notificacoes_chamado(
      NEW.workspace_id,
      auth.uid(),
      'chamado_status',
      _codigo || ': status alterado',
      COALESCE(_ator_nome, 'Alguém') || ' mudou o status de '
        || OLD.status::text || ' para ' || NEW.status::text
        || ' em "' || left(NEW.titulo, 60) || '"',
      _link,
      NEW.id,
      NEW
    );
  END IF;

  IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
    IF NEW.responsavel_id IS NOT NULL THEN
      SELECT nome INTO _resp_nome FROM public.perfis WHERE id = NEW.responsavel_id;
    ELSE
      _resp_nome := NULL;
    END IF;

    PERFORM public.inserir_notificacoes_chamado(
      NEW.workspace_id,
      auth.uid(),
      'chamado_responsavel',
      _codigo || ': responsável atualizado',
      COALESCE(_ator_nome, 'Alguém') || ' atribuiu '
        || COALESCE(_resp_nome, 'novo responsável')
        || ' ao chamado "' || left(NEW.titulo, 60) || '"',
      _link,
      NEW.id,
      NEW
    );
  END IF;

  IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
    PERFORM public.inserir_notificacoes_chamado(
      NEW.workspace_id,
      auth.uid(),
      'chamado_prioridade',
      _codigo || ': prioridade alterada',
      COALESCE(_ator_nome, 'Alguém') || ' alterou a prioridade para '
        || NEW.prioridade::text,
      _link,
      NEW.id,
      NEW
    );
  END IF;

  IF NEW.departamento_id IS DISTINCT FROM OLD.departamento_id THEN
    PERFORM public.inserir_notificacoes_chamado(
      NEW.workspace_id,
      auth.uid(),
      'chamado_departamento',
      _codigo || ': departamento alterado',
      COALESCE(_ator_nome, 'Alguém') || ' alterou o departamento responsável do chamado.',
      _link,
      NEW.id,
      NEW
    );
  END IF;

  IF NEW.prazo IS DISTINCT FROM OLD.prazo THEN
    PERFORM public.inserir_notificacoes_chamado(
      NEW.workspace_id,
      auth.uid(),
      'chamado_prazo',
      _codigo || ': prazo alterado',
      COALESCE(_ator_nome, 'Alguém') || ' alterou o prazo do chamado.',
      _link,
      NEW.id,
      NEW
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_comentario_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.chamados;
  _ator_nome text;
  _codigo text;
  _link text;
  _dest uuid;
  _tipo text;
  _titulo text;
BEGIN
  SELECT * INTO _c FROM public.chamados WHERE id = NEW.chamado_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO _ator_nome FROM public.perfis WHERE id = NEW.autor_id;
  _codigo := COALESCE(_c.codigo, '#' || _c.numero::text);
  _link := public.link_chamado_notificacao(_c.workspace_id, _c.numero);
  _tipo := CASE WHEN NEW.interno THEN 'chamado_comentario_interno' ELSE 'chamado_comentario' END;
  _titulo := _codigo || ': novo comentário';

  FOR _dest IN
    SELECT DISTINCT d
    FROM public.destinatarios_notificacao_chamado(_c, NEW.autor_id) AS d
  LOOP
    IF NEW.interno AND _dest = _c.solicitante_id THEN
      CONTINUE;
    END IF;

    INSERT INTO public.notificacoes (
      workspace_id,
      destinatario_id,
      ator_id,
      tipo,
      titulo,
      mensagem,
      link,
      recurso_tipo,
      recurso_id
    ) VALUES (
      _c.workspace_id,
      _dest,
      NEW.autor_id,
      _tipo,
      _titulo,
      COALESCE(_ator_nome, 'Alguém') || ': ' || left(NEW.conteudo, 200),
      _link,
      'chamado',
      _c.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_anexo_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.chamados;
  _ator_nome text;
  _codigo text;
  _link text;
BEGIN
  SELECT * INTO _c FROM public.chamados WHERE id = NEW.chamado_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO _ator_nome FROM public.perfis WHERE id = NEW.enviado_por;
  _codigo := COALESCE(_c.codigo, '#' || _c.numero::text);
  _link := public.link_chamado_notificacao(_c.workspace_id, _c.numero);

  PERFORM public.inserir_notificacoes_chamado(
    _c.workspace_id,
    NEW.enviado_por,
    'chamado_anexo',
    _codigo || ': novo anexo',
    COALESCE(_ator_nome, 'Alguém') || ' anexou "' || left(NEW.nome_arquivo, 100) || '"',
    _link,
    _c.id,
    _c
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamado_notificar_insert ON public.chamados;
CREATE TRIGGER trg_chamado_notificar_insert
  AFTER INSERT ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_chamado_criado();

DROP TRIGGER IF EXISTS trg_chamado_notificar_update ON public.chamados;
CREATE TRIGGER trg_chamado_notificar_update
  AFTER UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_chamado_atualizado();

DROP TRIGGER IF EXISTS trg_comentario_notificar ON public.chamado_comentarios;
CREATE TRIGGER trg_comentario_notificar
  AFTER INSERT ON public.chamado_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_comentario_chamado();

DROP TRIGGER IF EXISTS trg_anexo_notificar ON public.chamado_anexos;
CREATE TRIGGER trg_anexo_notificar
  AFTER INSERT ON public.chamado_anexos
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_anexo_chamado();
