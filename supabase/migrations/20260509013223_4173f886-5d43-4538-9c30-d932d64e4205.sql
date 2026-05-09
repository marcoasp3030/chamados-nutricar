CREATE TABLE public.workspace_vmpay_config (
  workspace_id uuid PRIMARY KEY,
  api_key text,
  ativo boolean NOT NULL DEFAULT false,
  atualizado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_vmpay_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY vmpay_config_selecionar ON public.workspace_vmpay_config
  FOR SELECT USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));

CREATE POLICY vmpay_config_inserir ON public.workspace_vmpay_config
  FOR INSERT WITH CHECK (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));

CREATE POLICY vmpay_config_atualizar ON public.workspace_vmpay_config
  FOR UPDATE USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));

CREATE POLICY vmpay_config_excluir ON public.workspace_vmpay_config
  FOR DELETE USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));

CREATE TRIGGER trg_vmpay_atualizado_em
  BEFORE UPDATE ON public.workspace_vmpay_config
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();