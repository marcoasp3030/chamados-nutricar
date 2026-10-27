-- Suporte: ver chamados abertos de colegas do mesmo departamento e assumir (reatribuir a si).
-- Idempotente.

CREATE OR REPLACE FUNCTION public.suporte_chamado_aberto_colega(
  _workspace_id uuid,
  _departamento_id uuid,
  _responsavel_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _responsavel_id IS NOT NULL
    AND _responsavel_id <> auth.uid()
    AND _departamento_id IS NOT NULL
    AND _departamento_id IN (SELECT public.departamentos_do_usuario(_workspace_id))
    AND EXISTS (
      SELECT 1
      FROM public.workspace_membros wm_resp
      JOIN public.workspace_membro_departamentos wmd ON wmd.membro_id = wm_resp.id
      WHERE wm_resp.workspace_id = _workspace_id
        AND wm_resp.usuario_id = _responsavel_id
        AND wm_resp.ativo = true
        AND wm_resp.papel = 'Suporte'::public.papel_membro
        AND wmd.departamento_id = _departamento_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.suporte_chamado_aberto_colega(uuid, uuid, uuid)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.suporte_pode_atualizar_chamado(
  _id uuid,
  _workspace_id uuid,
  _novo_responsavel_id uuid,
  _novo_status public.status_chamado
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.tem_papel_apenas_suporte(_workspace_id) THEN false
    WHEN EXISTS (
      SELECT 1
      FROM public.chamados c
      WHERE c.id = _id
        AND c.workspace_id = _workspace_id
        AND c.responsavel_id = auth.uid()
    ) THEN
      _novo_responsavel_id = auth.uid()
      OR (
        _novo_responsavel_id IS NULL
        AND _novo_status = 'Aberto'::public.status_chamado
      )
    WHEN EXISTS (
      SELECT 1
      FROM public.chamados c
      WHERE c.id = _id
        AND c.workspace_id = _workspace_id
        AND public.suporte_chamado_aberto_colega(
          c.workspace_id,
          c.departamento_id,
          c.responsavel_id
        )
        AND c.status NOT IN (
          'Fechado'::public.status_chamado,
          'Cancelado'::public.status_chamado,
          'Resolvido'::public.status_chamado
        )
    ) THEN
      _novo_responsavel_id = auth.uid()
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.suporte_pode_atualizar_chamado(uuid, uuid, uuid, public.status_chamado)
  TO anon, authenticated;

-- Técnico responsável pode registrar comentário interno (devolução, assumir da equipe).
DROP POLICY IF EXISTS comentarios_inserir ON public.chamado_comentarios;

CREATE POLICY comentarios_inserir ON public.chamado_comentarios
FOR INSERT
WITH CHECK (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND autor_id = auth.uid()
  AND (
    NOT interno
    OR public.pode_ver_todos_chamados(workspace_id)
    OR (
      interno
      AND chamado_id IN (
        SELECT c.id
        FROM public.chamados c
        WHERE c.workspace_id = chamado_comentarios.workspace_id
          AND c.responsavel_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;

CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    (
      public.tem_papel_apenas_suporte(workspace_id)
      AND (
        responsavel_id = auth.uid()
        OR (
          status NOT IN (
            'Fechado'::public.status_chamado,
            'Cancelado'::public.status_chamado,
            'Resolvido'::public.status_chamado
          )
          AND public.suporte_chamado_aberto_colega(
            workspace_id,
            departamento_id,
            responsavel_id
          )
        )
      )
    )
    OR (
      NOT public.tem_papel_apenas_suporte(workspace_id)
      AND (
        public.tem_papel_workspace(
          workspace_id,
          ARRAY['Proprietario'::public.papel_membro, 'Administrador'::public.papel_membro]
        )
        OR solicitante_id = auth.uid()
        OR (
          departamento_id IS NOT NULL
          AND departamento_id IN (
            SELECT public.departamentos_do_usuario(chamados.workspace_id)
          )
        )
        OR (
          solicitante_id IS NOT NULL
          AND public.compartilha_departamento(chamados.workspace_id, solicitante_id)
        )
      )
    )
  )
);

DROP POLICY IF EXISTS chamados_atualizar ON public.chamados;

CREATE POLICY chamados_atualizar ON public.chamados
FOR UPDATE
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    (
      public.tem_papel_apenas_suporte(workspace_id)
      AND (
        responsavel_id = auth.uid()
        OR (
          status NOT IN (
            'Fechado'::public.status_chamado,
            'Cancelado'::public.status_chamado,
            'Resolvido'::public.status_chamado
          )
          AND public.suporte_chamado_aberto_colega(
            workspace_id,
            departamento_id,
            responsavel_id
          )
        )
      )
    )
    OR (
      NOT public.tem_papel_apenas_suporte(workspace_id)
      AND (
        public.tem_papel_workspace(
          workspace_id,
          ARRAY[
            'Proprietario'::public.papel_membro,
            'Administrador'::public.papel_membro,
            'Gestor'::public.papel_membro,
            'Atendente'::public.papel_membro
          ]
        )
        OR (
          solicitante_id = auth.uid()
          AND status <> ALL (ARRAY['Fechado'::public.status_chamado, 'Cancelado'::public.status_chamado])
        )
        OR (
          departamento_id IS NOT NULL
          AND departamento_id IN (
            SELECT public.departamentos_do_usuario(chamados.workspace_id)
          )
        )
      )
    )
  )
)
WITH CHECK (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.suporte_pode_atualizar_chamado(
      id,
      workspace_id,
      responsavel_id,
      status
    )
    OR (
      NOT public.tem_papel_apenas_suporte(workspace_id)
      AND (
        public.tem_papel_workspace(
          workspace_id,
          ARRAY[
            'Proprietario'::public.papel_membro,
            'Administrador'::public.papel_membro,
            'Gestor'::public.papel_membro,
            'Atendente'::public.papel_membro
          ]
        )
        OR (
          solicitante_id = auth.uid()
          AND status <> ALL (ARRAY['Fechado'::public.status_chamado, 'Cancelado'::public.status_chamado])
        )
        OR (
          departamento_id IS NOT NULL
          AND departamento_id IN (
            SELECT public.departamentos_do_usuario(chamados.workspace_id)
          )
        )
      )
    )
  )
);
