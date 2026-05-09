
-- ENUMS
CREATE TYPE public.status_projeto AS ENUM (
  'Planejado',
  'Em andamento',
  'Pausado',
  'Concluido',
  'Arquivado'
);

CREATE TYPE public.status_tarefa AS ENUM (
  'A fazer',
  'Em andamento',
  'Em revisao',
  'Concluido'
);

-- TABELA projetos
CREATE TABLE public.projetos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#88BE46',
  status public.status_projeto NOT NULL DEFAULT 'Planejado',
  inicio_em DATE,
  fim_previsto DATE,
  responsavel_id UUID,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projetos_workspace ON public.projetos(workspace_id);
CREATE INDEX idx_projetos_status ON public.projetos(workspace_id, status);

-- TABELA tarefas
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status public.status_tarefa NOT NULL DEFAULT 'A fazer',
  prioridade public.prioridade_chamado NOT NULL DEFAULT 'Media',
  responsavel_id UUID,
  prazo TIMESTAMPTZ,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tarefas_projeto ON public.tarefas(projeto_id);
CREATE INDEX idx_tarefas_workspace ON public.tarefas(workspace_id);
CREATE INDEX idx_tarefas_status ON public.tarefas(projeto_id, status, ordem);

-- TRIGGERS atualizado_em
CREATE TRIGGER trg_projetos_atualizado
BEFORE UPDATE ON public.projetos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

CREATE TRIGGER trg_tarefas_atualizado
BEFORE UPDATE ON public.tarefas
FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

-- RLS
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Projetos: ver / criar / atualizar / excluir
CREATE POLICY projetos_selecionar ON public.projetos
FOR SELECT USING (workspace_id IN (SELECT public.workspaces_do_usuario()));

CREATE POLICY projetos_inserir ON public.projetos
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND criado_por = auth.uid()
);

CREATE POLICY projetos_atualizar ON public.projetos
FOR UPDATE USING (
  public.tem_papel_workspace(
    workspace_id,
    ARRAY['Proprietario', 'Administrador', 'Gestor', 'Atendente']::papel_membro[]
  )
);

CREATE POLICY projetos_excluir ON public.projetos
FOR DELETE USING (
  public.tem_papel_workspace(workspace_id, ARRAY['Proprietario', 'Administrador']::papel_membro[])
);

-- Tarefas
CREATE POLICY tarefas_selecionar ON public.tarefas
FOR SELECT USING (workspace_id IN (SELECT public.workspaces_do_usuario()));

CREATE POLICY tarefas_inserir ON public.tarefas
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND criado_por = auth.uid()
);

CREATE POLICY tarefas_atualizar ON public.tarefas
FOR UPDATE USING (
  public.tem_papel_workspace(
    workspace_id,
    ARRAY['Proprietario', 'Administrador', 'Gestor', 'Atendente']::papel_membro[]
  )
  OR responsavel_id = auth.uid()
);

CREATE POLICY tarefas_excluir ON public.tarefas
FOR DELETE USING (
  public.tem_papel_workspace(
    workspace_id,
    ARRAY['Proprietario', 'Administrador', 'Gestor']::papel_membro[]
  )
);
