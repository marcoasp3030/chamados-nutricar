-- Tabela de vínculo N:N entre membros do workspace e departamentos
CREATE TABLE IF NOT EXISTS public.workspace_membro_departamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membro_id uuid NOT NULL REFERENCES public.workspace_membros(id) ON DELETE CASCADE,
  departamento_id uuid NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membro_id, departamento_id)
);

CREATE INDEX IF NOT EXISTS idx_wmd_membro ON public.workspace_membro_departamentos(membro_id);
CREATE INDEX IF NOT EXISTS idx_wmd_departamento ON public.workspace_membro_departamentos(departamento_id);
CREATE INDEX IF NOT EXISTS idx_wmd_workspace ON public.workspace_membro_departamentos(workspace_id);

ALTER TABLE public.workspace_membro_departamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wmd_selecionar"
  ON public.workspace_membro_departamentos FOR SELECT
  USING (workspace_id IN (SELECT public.workspaces_do_usuario()));

CREATE POLICY "wmd_inserir"
  ON public.workspace_membro_departamentos FOR INSERT
  WITH CHECK (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro]));

CREATE POLICY "wmd_atualizar"
  ON public.workspace_membro_departamentos FOR UPDATE
  USING (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro]));

CREATE POLICY "wmd_excluir"
  ON public.workspace_membro_departamentos FOR DELETE
  USING (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro]));

-- Migra vínculos existentes (departamento_id legado) para a nova tabela
INSERT INTO public.workspace_membro_departamentos (membro_id, departamento_id, workspace_id)
SELECT wm.id, wm.departamento_id, wm.workspace_id
FROM public.workspace_membros wm
WHERE wm.departamento_id IS NOT NULL
ON CONFLICT (membro_id, departamento_id) DO NOTHING;