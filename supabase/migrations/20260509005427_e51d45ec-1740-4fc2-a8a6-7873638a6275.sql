
-- Tabela de configuração de IA por workspace
CREATE TABLE public.workspace_ia_config (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  openai_api_key TEXT,
  modelo TEXT NOT NULL DEFAULT 'gpt-5-mini',
  ativo BOOLEAN NOT NULL DEFAULT false,
  atualizado_por UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_ia_config ENABLE ROW LEVEL SECURITY;

-- Apenas Proprietário/Administrador podem ver e gerenciar
CREATE POLICY ia_config_selecionar ON public.workspace_ia_config
  FOR SELECT USING (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
  );

CREATE POLICY ia_config_inserir ON public.workspace_ia_config
  FOR INSERT WITH CHECK (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
  );

CREATE POLICY ia_config_atualizar ON public.workspace_ia_config
  FOR UPDATE USING (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
  );

CREATE POLICY ia_config_excluir ON public.workspace_ia_config
  FOR DELETE USING (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
  );

CREATE TRIGGER trg_ia_config_atualizado_em
  BEFORE UPDATE ON public.workspace_ia_config
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

-- Função auxiliar para verificar se usuário pertence ao workspace (sem exigir papel admin)
-- (já existe workspaces_do_usuario)

-- Função SECURITY DEFINER para edge function buscar config (com service role já tem acesso, mas mantemos RLS limpa)
