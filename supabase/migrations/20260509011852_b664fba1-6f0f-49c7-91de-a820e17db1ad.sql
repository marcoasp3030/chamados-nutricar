
CREATE POLICY "perfis_atualizar_admins_workspace"
  ON public.perfis FOR UPDATE
  USING (
    id IN (
      SELECT wm.usuario_id
      FROM public.workspace_membros wm
      WHERE wm.workspace_id IN (SELECT public.workspaces_do_usuario())
        AND public.tem_papel_workspace(
          wm.workspace_id,
          ARRAY['Proprietario','Administrador']::papel_membro[]
        )
    )
  );
