-- Restringe visibilidade dos chamados:
-- Usuário vê apenas chamados:
--  * do(s) departamento(s) ao(s) qual(is) está vinculado (atual ou origem)
--  * que ele abriu (solicitante ou criador)
--  * dos quais é responsável
-- Proprietário do workspace mantém visão total (administração).

DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;

CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro])
    OR solicitante_id = auth.uid()
    OR criado_por = auth.uid()
    OR responsavel_id = auth.uid()
    OR (departamento_id IS NOT NULL AND departamento_id IN (SELECT public.departamentos_do_usuario(chamados.workspace_id)))
    OR (departamento_origem_id IS NOT NULL AND departamento_origem_id IN (SELECT public.departamentos_do_usuario(chamados.workspace_id)))
  )
);