-- REVERTIDO: política anterior (20-papel-suporte). A regra com EXISTS no chamado pai
-- causava lentidão e ocultava chamados (recursão RLS). Idempotente.

DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;

CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    (
      public.tem_papel_apenas_suporte(workspace_id)
      AND responsavel_id = auth.uid()
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

DROP FUNCTION IF EXISTS public.usuario_pode_ver_chamado(public.chamados);
