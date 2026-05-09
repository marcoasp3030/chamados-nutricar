CREATE TABLE public.categorias_chamado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  cor text NOT NULL DEFAULT '#88BE46',
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, nome)
);

ALTER TABLE public.categorias_chamado ENABLE ROW LEVEL SECURITY;

CREATE POLICY categorias_selecionar ON public.categorias_chamado
  FOR SELECT USING (workspace_id IN (SELECT workspaces_do_usuario()));

CREATE POLICY categorias_inserir ON public.categorias_chamado
  FOR INSERT WITH CHECK (
    tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
    AND criado_por = auth.uid()
  );

CREATE POLICY categorias_atualizar ON public.categorias_chamado
  FOR UPDATE USING (
    tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
  );

CREATE POLICY categorias_excluir ON public.categorias_chamado
  FOR DELETE USING (
    tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
  );

CREATE TRIGGER categorias_chamado_atualizado_em
  BEFORE UPDATE ON public.categorias_chamado
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

CREATE INDEX idx_categorias_chamado_workspace ON public.categorias_chamado(workspace_id);