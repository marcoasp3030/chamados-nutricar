-- Restringir SELECT: apenas chamados do(s) departamento(s) do usuário (ou próprios / admin)
DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;

CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
    OR solicitante_id = auth.uid()
    OR (
      departamento_id IS NOT NULL
      AND departamento_id IN (SELECT public.departamentos_do_usuario(chamados.workspace_id))
    )
  )
);

-- Ajustar UPDATE para refletir a mesma lógica (remove acesso via responsavel/criador que não estejam no dept)
DROP POLICY IF EXISTS chamados_atualizar ON public.chamados;

CREATE POLICY chamados_atualizar ON public.chamados
FOR UPDATE
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro, 'Gestor'::papel_membro, 'Atendente'::papel_membro])
    OR (
      solicitante_id = auth.uid()
      AND status <> ALL (ARRAY['Fechado'::status_chamado, 'Cancelado'::status_chamado])
    )
    OR (
      departamento_id IS NOT NULL
      AND departamento_id IN (SELECT public.departamentos_do_usuario(chamados.workspace_id))
    )
  )
);