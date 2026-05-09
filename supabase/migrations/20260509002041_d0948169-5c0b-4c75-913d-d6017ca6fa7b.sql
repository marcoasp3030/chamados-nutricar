
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.plano_workspace AS ENUM ('Gratuito', 'Inicial', 'Profissional', 'Empresarial');
CREATE TYPE public.status_workspace AS ENUM ('Ativo', 'Suspenso', 'Cancelado');
CREATE TYPE public.papel_membro AS ENUM ('Proprietario', 'Administrador', 'Gestor', 'Atendente', 'Solicitante');

-- =========================================================
-- TABELA: perfis (1 por usuário, id = auth.users.id)
-- =========================================================
CREATE TABLE public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL,
  avatar_url text,
  telefone text,
  ultimo_workspace_id uuid,
  super_admin boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- TABELA: workspaces
-- =========================================================
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  cor_primaria text NOT NULL DEFAULT '#88BE46',
  cnpj text,
  plano public.plano_workspace NOT NULL DEFAULT 'Gratuito',
  status public.status_workspace NOT NULL DEFAULT 'Ativo',
  limite_usuarios integer NOT NULL DEFAULT 5,
  limite_chamados_mes integer NOT NULL DEFAULT 100,
  fuso_horario text NOT NULL DEFAULT 'America/Sao_Paulo',
  proprietario_id uuid NOT NULL REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- TABELA: workspace_membros
-- =========================================================
CREATE TABLE public.workspace_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel public.papel_membro NOT NULL DEFAULT 'Solicitante',
  ativo boolean NOT NULL DEFAULT true,
  convidado_por uuid REFERENCES auth.users(id),
  aceito_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, usuario_id)
);

ALTER TABLE public.workspace_membros ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_workspace_membros_usuario ON public.workspace_membros(usuario_id);
CREATE INDEX idx_workspace_membros_workspace ON public.workspace_membros(workspace_id);

-- =========================================================
-- TABELA: workspace_convites
-- =========================================================
CREATE TABLE public.workspace_convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  papel public.papel_membro NOT NULL DEFAULT 'Solicitante',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  aceito boolean NOT NULL DEFAULT false,
  convidado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_convites ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_convites_email ON public.workspace_convites(email);
CREATE INDEX idx_convites_workspace ON public.workspace_convites(workspace_id);

-- =========================================================
-- FUNÇÃO: workspaces_do_usuario()
-- Retorna os workspaces dos quais o usuário autenticado é membro ativo.
-- Usada em TODAS as policies RLS para evitar recursão.
-- =========================================================
CREATE OR REPLACE FUNCTION public.workspaces_do_usuario()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.workspace_membros
  WHERE usuario_id = auth.uid()
    AND ativo = true;
$$;

-- =========================================================
-- FUNÇÃO: tem_papel_workspace(workspace_id, papeis[])
-- Verifica se o usuário autenticado tem algum dos papéis no workspace.
-- =========================================================
CREATE OR REPLACE FUNCTION public.tem_papel_workspace(_workspace_id uuid, _papeis public.papel_membro[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_membros
    WHERE workspace_id = _workspace_id
      AND usuario_id = auth.uid()
      AND ativo = true
      AND papel = ANY(_papeis)
  );
$$;

-- =========================================================
-- FUNÇÃO: atualiza coluna atualizado_em
-- =========================================================
CREATE OR REPLACE FUNCTION public.atualizar_coluna_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_perfis_atualizado_em
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

CREATE TRIGGER trg_workspaces_atualizado_em
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

-- =========================================================
-- TRIGGER: cria perfil automaticamente ao criar usuário
-- =========================================================
CREATE OR REPLACE FUNCTION public.criar_perfil_novo_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_criar_perfil_apos_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.criar_perfil_novo_usuario();

-- =========================================================
-- POLICIES: perfis
-- =========================================================
CREATE POLICY "perfis_selecionar_proprio"
  ON public.perfis FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "perfis_selecionar_colegas_workspace"
  ON public.perfis FOR SELECT
  USING (
    id IN (
      SELECT usuario_id FROM public.workspace_membros
      WHERE workspace_id IN (SELECT public.workspaces_do_usuario())
    )
  );

CREATE POLICY "perfis_atualizar_proprio"
  ON public.perfis FOR UPDATE
  USING (id = auth.uid());

-- =========================================================
-- POLICIES: workspaces
-- =========================================================
CREATE POLICY "workspaces_selecionar_membros"
  ON public.workspaces FOR SELECT
  USING (id IN (SELECT public.workspaces_do_usuario()));

CREATE POLICY "workspaces_inserir_autenticados"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = proprietario_id);

CREATE POLICY "workspaces_atualizar_admins"
  ON public.workspaces FOR UPDATE
  USING (public.tem_papel_workspace(id, ARRAY['Proprietario','Administrador']::public.papel_membro[]));

CREATE POLICY "workspaces_excluir_proprietario"
  ON public.workspaces FOR DELETE
  USING (public.tem_papel_workspace(id, ARRAY['Proprietario']::public.papel_membro[]));

-- =========================================================
-- POLICIES: workspace_membros
-- =========================================================
CREATE POLICY "membros_selecionar_mesma_empresa"
  ON public.workspace_membros FOR SELECT
  USING (workspace_id IN (SELECT public.workspaces_do_usuario()));

CREATE POLICY "membros_inserir_admins"
  ON public.workspace_membros FOR INSERT
  WITH CHECK (
    -- Permite o próprio usuário se inserir como Proprietário ao criar workspace
    (usuario_id = auth.uid() AND papel = 'Proprietario')
    OR public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::public.papel_membro[])
  );

CREATE POLICY "membros_atualizar_admins"
  ON public.workspace_membros FOR UPDATE
  USING (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::public.papel_membro[]));

CREATE POLICY "membros_excluir_admins"
  ON public.workspace_membros FOR DELETE
  USING (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::public.papel_membro[]));

-- =========================================================
-- POLICIES: workspace_convites
-- =========================================================
CREATE POLICY "convites_selecionar_admins"
  ON public.workspace_convites FOR SELECT
  USING (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::public.papel_membro[]));

CREATE POLICY "convites_selecionar_destinatario"
  ON public.workspace_convites FOR SELECT
  USING (email = (SELECT email FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "convites_inserir_admins"
  ON public.workspace_convites FOR INSERT
  WITH CHECK (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::public.papel_membro[]));

CREATE POLICY "convites_atualizar_admins"
  ON public.workspace_convites FOR UPDATE
  USING (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::public.papel_membro[])
    OR email = (SELECT email FROM public.perfis WHERE id = auth.uid())
  );

CREATE POLICY "convites_excluir_admins"
  ON public.workspace_convites FOR DELETE
  USING (public.tem_papel_workspace(workspace_id, ARRAY['Proprietario','Administrador']::public.papel_membro[]));
