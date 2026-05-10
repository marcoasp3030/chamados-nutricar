
CREATE TABLE public.workspace_uazapi_config (
  workspace_id uuid PRIMARY KEY,
  server_url text,
  admin_token text,
  instance_token text,
  instance_name text,
  instance_id text,
  status text NOT NULL DEFAULT 'disconnected',
  qr_code text,
  numero_conectado text,
  conectado_em timestamptz,
  ultima_sincronizacao timestamptz,
  ativo boolean NOT NULL DEFAULT false,
  atualizado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_uazapi_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY uazapi_config_select ON public.workspace_uazapi_config
  FOR SELECT USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));
CREATE POLICY uazapi_config_insert ON public.workspace_uazapi_config
  FOR INSERT WITH CHECK (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));
CREATE POLICY uazapi_config_update ON public.workspace_uazapi_config
  FOR UPDATE USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));
CREATE POLICY uazapi_config_delete ON public.workspace_uazapi_config
  FOR DELETE USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));

CREATE TRIGGER trg_uazapi_config_atualizado
  BEFORE UPDATE ON public.workspace_uazapi_config
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

CREATE TABLE public.workspace_uazapi_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  acao text NOT NULL,
  status_http integer,
  sucesso boolean NOT NULL DEFAULT true,
  mensagem text,
  detalhes jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_uazapi_logs_workspace ON public.workspace_uazapi_logs(workspace_id, criado_em DESC);

ALTER TABLE public.workspace_uazapi_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY uazapi_logs_select ON public.workspace_uazapi_logs
  FOR SELECT USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));
CREATE POLICY uazapi_logs_insert ON public.workspace_uazapi_logs
  FOR INSERT WITH CHECK (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));
