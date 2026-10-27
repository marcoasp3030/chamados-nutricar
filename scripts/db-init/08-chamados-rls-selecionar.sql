-- Restaura policy SELECT em chamados (removida acidentalmente pelo 02-rls-e-funcoes.sql truncado).
-- Sem ela: listagem vazia e INSERT com RETURNING falha com "violates row-level security".

DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;

CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro, 'Gestor'::papel_membro, 'Atendente'::papel_membro]
    )
    OR solicitante_id = auth.uid()
    OR criado_por = auth.uid()
    OR responsavel_id = auth.uid()
    OR (
      departamento_id IS NOT NULL
      AND departamento_id IN (SELECT public.departamentos_do_usuario(workspace_id))
    )
    OR (
      departamento_origem_id IS NOT NULL
      AND departamento_origem_id IN (SELECT public.departamentos_do_usuario(workspace_id))
    )
  )
);
