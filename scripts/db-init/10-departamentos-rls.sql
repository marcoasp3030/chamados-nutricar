-- Departamentos: Gestor pode gerenciar; criado_por preenchido pelo JWT (evita mismatch no INSERT/RETURNING).

CREATE OR REPLACE FUNCTION public.preencher_criado_por()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.criado_por := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_departamentos_criado_por ON public.departamentos;
CREATE TRIGGER trg_departamentos_criado_por
  BEFORE INSERT ON public.departamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.preencher_criado_por();

DROP POLICY IF EXISTS departamentos_inserir ON public.departamentos;
CREATE POLICY departamentos_inserir ON public.departamentos
  FOR INSERT
  WITH CHECK (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro, 'Gestor'::papel_membro]
    )
  );

DROP POLICY IF EXISTS departamentos_atualizar ON public.departamentos;
CREATE POLICY departamentos_atualizar ON public.departamentos
  FOR UPDATE
  USING (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro, 'Gestor'::papel_membro]
    )
  );

DROP POLICY IF EXISTS departamentos_excluir ON public.departamentos;
CREATE POLICY departamentos_excluir ON public.departamentos
  FOR DELETE
  USING (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro, 'Gestor'::papel_membro]
    )
  );

-- Categorias: mesma regra (Gestor + trigger criado_por)
DROP TRIGGER IF EXISTS trg_categorias_criado_por ON public.categorias_chamado;
CREATE TRIGGER trg_categorias_criado_por
  BEFORE INSERT ON public.categorias_chamado
  FOR EACH ROW
  EXECUTE FUNCTION public.preencher_criado_por();

DROP POLICY IF EXISTS categorias_inserir ON public.categorias_chamado;
CREATE POLICY categorias_inserir ON public.categorias_chamado
  FOR INSERT
  WITH CHECK (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro, 'Gestor'::papel_membro]
    )
  );

DROP POLICY IF EXISTS categorias_atualizar ON public.categorias_chamado;
CREATE POLICY categorias_atualizar ON public.categorias_chamado
  FOR UPDATE
  USING (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro, 'Gestor'::papel_membro]
    )
  );

DROP POLICY IF EXISTS categorias_excluir ON public.categorias_chamado;
CREATE POLICY categorias_excluir ON public.categorias_chamado
  FOR DELETE
  USING (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro, 'Gestor'::papel_membro]
    )
  );
