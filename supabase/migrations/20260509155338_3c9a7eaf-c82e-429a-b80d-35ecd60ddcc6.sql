-- Permitir que o "observador" (campo responsavel_id) acompanhe o chamado
-- e veja toda a interação (comentários públicos, histórico, anexos, execuções de IA, itens de requisição).

DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;
CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT USING (
  (workspace_id IN (SELECT workspaces_do_usuario()))
  AND (
    pode_ver_todos_chamados(workspace_id)
    OR solicitante_id = auth.uid()
    OR criado_por = auth.uid()
    OR responsavel_id = auth.uid()
  )
);

DROP POLICY IF EXISTS comentarios_selecionar ON public.chamado_comentarios;
CREATE POLICY comentarios_selecionar ON public.chamado_comentarios
FOR SELECT USING (
  (workspace_id IN (SELECT workspaces_do_usuario()))
  AND ((NOT interno) OR pode_ver_todos_chamados(workspace_id))
  AND (chamado_id IN (
    SELECT id FROM chamados
    WHERE workspace_id IN (SELECT workspaces_do_usuario())
      AND (pode_ver_todos_chamados(workspace_id)
           OR solicitante_id = auth.uid()
           OR criado_por = auth.uid()
           OR responsavel_id = auth.uid())
  ))
);

DROP POLICY IF EXISTS anexos_selecionar ON public.chamado_anexos;
CREATE POLICY anexos_selecionar ON public.chamado_anexos
FOR SELECT USING (
  (workspace_id IN (SELECT workspaces_do_usuario()))
  AND (chamado_id IN (
    SELECT id FROM chamados
    WHERE workspace_id IN (SELECT workspaces_do_usuario())
      AND (pode_ver_todos_chamados(workspace_id)
           OR solicitante_id = auth.uid()
           OR criado_por = auth.uid()
           OR responsavel_id = auth.uid())
  ))
);

DROP POLICY IF EXISTS historico_selecionar ON public.chamado_historico;
CREATE POLICY historico_selecionar ON public.chamado_historico
FOR SELECT USING (
  (workspace_id IN (SELECT workspaces_do_usuario()))
  AND (chamado_id IN (
    SELECT id FROM chamados
    WHERE workspace_id IN (SELECT workspaces_do_usuario())
      AND (pode_ver_todos_chamados(workspace_id)
           OR solicitante_id = auth.uid()
           OR criado_por = auth.uid()
           OR responsavel_id = auth.uid())
  ))
);

DROP POLICY IF EXISTS ia_execucoes_selecionar ON public.chamado_ia_execucoes;
CREATE POLICY ia_execucoes_selecionar ON public.chamado_ia_execucoes
FOR SELECT USING (
  (workspace_id IN (SELECT workspaces_do_usuario()))
  AND (chamado_id IN (
    SELECT id FROM chamados
    WHERE workspace_id IN (SELECT workspaces_do_usuario())
      AND (pode_ver_todos_chamados(workspace_id)
           OR solicitante_id = auth.uid()
           OR criado_por = auth.uid()
           OR responsavel_id = auth.uid())
  ))
);

DROP POLICY IF EXISTS req_itens_selecionar ON public.chamado_requisicao_itens;
CREATE POLICY req_itens_selecionar ON public.chamado_requisicao_itens
FOR SELECT USING (
  (workspace_id IN (SELECT workspaces_do_usuario()))
  AND (chamado_id IN (
    SELECT id FROM chamados
    WHERE workspace_id IN (SELECT workspaces_do_usuario())
      AND (pode_ver_todos_chamados(workspace_id)
           OR solicitante_id = auth.uid()
           OR criado_por = auth.uid()
           OR responsavel_id = auth.uid())
  ))
);