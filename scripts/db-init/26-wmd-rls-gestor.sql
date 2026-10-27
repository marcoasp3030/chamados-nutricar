-- Alinha RLS com a UI/API: Gestor também gerencia usuários e vínculos N:N
-- de departamentos (mesmo critério de exigirGerenciarUsuarios / podeGerenciarUsuarios).
--
-- Sintoma: "new row violates row-level security policy for table
-- workspace_membro_departamentos" ao salvar departamentos do membro.

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

-- Salvar membro (cargo/papel/departamento legado) também passa pelo PostgREST
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
