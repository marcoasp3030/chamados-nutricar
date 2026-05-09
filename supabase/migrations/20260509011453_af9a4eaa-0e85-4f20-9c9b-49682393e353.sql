
-- Cargo (perfil interno do colaborador no workspace)
CREATE TYPE public.cargo_workspace AS ENUM ('Funcionario', 'Supervisor', 'Gestor', 'Gerente');

-- Departamentos
CREATE TABLE public.departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, nome)
);

CREATE INDEX idx_departamentos_workspace ON public.departamentos (workspace_id);

ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departamentos_selecionar"
  ON public.departamentos FOR SELECT
  USING (workspace_id IN (SELECT public.workspaces_do_usuario()));

CREATE POLICY "departamentos_inserir"
  ON public.departamentos FOR INSERT
  WITH CHECK (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::papel_membro[])
    AND criado_por = auth.uid()
  );

CREATE POLICY "departamentos_atualizar"
  ON public.departamentos FOR UPDATE
  USING (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::papel_membro[]));

CREATE POLICY "departamentos_excluir"
  ON public.departamentos FOR DELETE
  USING (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::papel_membro[]));

CREATE TRIGGER trg_departamentos_atualizado_em
  BEFORE UPDATE ON public.departamentos
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

-- Vincular membros e convites a departamento + cargo
ALTER TABLE public.workspace_membros
  ADD COLUMN departamento_id uuid REFERENCES public.departamentos(id) ON DELETE SET NULL,
  ADD COLUMN cargo public.cargo_workspace;

ALTER TABLE public.workspace_convites
  ADD COLUMN departamento_id uuid REFERENCES public.departamentos(id) ON DELETE SET NULL,
  ADD COLUMN cargo public.cargo_workspace,
  ADD COLUMN nome text,
  ADD COLUMN telefone text;
