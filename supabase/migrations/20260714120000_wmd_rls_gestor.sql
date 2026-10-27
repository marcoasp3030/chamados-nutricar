-- Espelho de scripts/db-init/26-wmd-rls-gestor.sql
-- Gestor pode INSERT/UPDATE/DELETE em workspace_membro_departamentos
-- e UPDATE em workspace_membros (alinhar com gestão de usuários na UI).

DROP POLICY IF EXISTS "wmd_inserir" ON public.workspace_membro_departamentos;
CREATE POLICY "wmd_inserir"
  ON public.workspace_membro_departamentos FOR INSERT
  WITH CHECK (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY[
        'Proprietario'::papel_membro,
        'Administrador'::papel_membro,
        'Gestor'::papel_membro
      ]
    )
  );

DROP POLICY IF EXISTS "wmd_atualizar" ON public.workspace_membro_departamentos;
CREATE POLICY "wmd_atualizar"
  ON public.workspace_membro_departamentos FOR UPDATE
  USING (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY[
        'Proprietario'::papel_membro,
        'Administrador'::papel_membro,
        'Gestor'::papel_membro
      ]
    )
  );

DROP POLICY IF EXISTS "wmd_excluir" ON public.workspace_membro_departamentos;
CREATE POLICY "wmd_excluir"
  ON public.workspace_membro_departamentos FOR DELETE
  USING (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY[
        'Proprietario'::papel_membro,
        'Administrador'::papel_membro,
        'Gestor'::papel_membro
      ]
    )
  );

DROP POLICY IF EXISTS "membros_atualizar_admins" ON public.workspace_membros;
CREATE POLICY "membros_atualizar_admins"
  ON public.workspace_membros FOR UPDATE
  USING (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY[
        'Proprietario'::papel_membro,
        'Administrador'::papel_membro,
        'Gestor'::papel_membro
      ]
    )
  );
