
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.status_chamado AS ENUM (
  'Aberto',
  'Em andamento',
  'Aguardando solicitante',
  'Aguardando terceiros',
  'Resolvido',
  'Fechado',
  'Cancelado'
);

CREATE TYPE public.prioridade_chamado AS ENUM (
  'Baixa',
  'Media',
  'Alta',
  'Urgente'
);

CREATE TYPE public.tipo_chamado AS ENUM (
  'Incidente',
  'Solicitacao',
  'Duvida',
  'Melhoria',
  'Bug'
);

-- ============================================================
-- TABELA: chamados
-- ============================================================
CREATE TABLE public.chamados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status public.status_chamado NOT NULL DEFAULT 'Aberto',
  prioridade public.prioridade_chamado NOT NULL DEFAULT 'Media',
  tipo public.tipo_chamado NOT NULL DEFAULT 'Solicitacao',
  categoria TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  solicitante_id UUID NOT NULL,
  responsavel_id UUID,
  chamado_pai_id UUID REFERENCES public.chamados(id) ON DELETE SET NULL,
  prazo TIMESTAMP WITH TIME ZONE,
  primeiro_resposta_em TIMESTAMP WITH TIME ZONE,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  fechado_em TIMESTAMP WITH TIME ZONE,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, numero)
);

CREATE INDEX idx_chamados_workspace ON public.chamados(workspace_id);
CREATE INDEX idx_chamados_status ON public.chamados(workspace_id, status);
CREATE INDEX idx_chamados_responsavel ON public.chamados(responsavel_id);
CREATE INDEX idx_chamados_solicitante ON public.chamados(solicitante_id);
CREATE INDEX idx_chamados_pai ON public.chamados(chamado_pai_id);

-- ============================================================
-- TABELA: chamado_comentarios
-- ============================================================
CREATE TABLE public.chamado_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  interno BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_comentarios_chamado ON public.chamado_comentarios(chamado_id);

-- ============================================================
-- TABELA: chamado_anexos
-- ============================================================
CREATE TABLE public.chamado_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  comentario_id UUID REFERENCES public.chamado_comentarios(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enviado_por UUID NOT NULL,
  caminho_storage TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  tipo_mime TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_anexos_chamado ON public.chamado_anexos(chamado_id);

-- ============================================================
-- TABELA: chamado_historico
-- ============================================================
CREATE TABLE public.chamado_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  usuario_id UUID,
  acao TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_historico_chamado ON public.chamado_historico(chamado_id, criado_em DESC);

-- ============================================================
-- FUNÇÃO: pode_ver_chamados_todos (atendentes+)
-- ============================================================
CREATE OR REPLACE FUNCTION public.pode_ver_todos_chamados(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_membros
    WHERE workspace_id = _workspace_id
      AND usuario_id = auth.uid()
      AND ativo = true
      AND papel IN ('Proprietario', 'Administrador', 'Gestor', 'Atendente')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.pode_ver_todos_chamados(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_todos_chamados(UUID) TO authenticated;

-- ============================================================
-- FUNÇÃO + TRIGGER: gerar número sequencial por workspace
-- ============================================================
CREATE OR REPLACE FUNCTION public.gerar_numero_chamado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proximo INTEGER;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    SELECT COALESCE(MAX(numero), 0) + 1 INTO proximo
    FROM public.chamados
    WHERE workspace_id = NEW.workspace_id;
    NEW.numero := proximo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chamado_numero
BEFORE INSERT ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.gerar_numero_chamado();

-- ============================================================
-- TRIGGERS: atualizar atualizado_em
-- ============================================================
CREATE TRIGGER trg_chamados_atualizado
BEFORE UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

CREATE TRIGGER trg_comentarios_atualizado
BEFORE UPDATE ON public.chamado_comentarios
FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

-- ============================================================
-- TRIGGER: histórico automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_historico_chamado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao)
    VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'criou o chamado');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou o status', 'status', OLD.status::text, NEW.status::text);
    END IF;

    IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou a prioridade', 'prioridade', OLD.prioridade::text, NEW.prioridade::text);
    END IF;

    IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou o responsável', 'responsavel_id',
        COALESCE(OLD.responsavel_id::text, ''), COALESCE(NEW.responsavel_id::text, ''));
    END IF;

    IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou o título', 'titulo', OLD.titulo, NEW.titulo);
    END IF;

    IF NEW.prazo IS DISTINCT FROM OLD.prazo THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou o prazo', 'prazo',
        COALESCE(OLD.prazo::text, ''), COALESCE(NEW.prazo::text, ''));
    END IF;

    -- Marcar resolvido_em / fechado_em automaticamente
    IF NEW.status = 'Resolvido' AND OLD.status IS DISTINCT FROM 'Resolvido' THEN
      NEW.resolvido_em := now();
    END IF;
    IF NEW.status = 'Fechado' AND OLD.status IS DISTINCT FROM 'Fechado' THEN
      NEW.fechado_em := now();
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chamado_historico_insert
AFTER INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_chamado();

CREATE TRIGGER trg_chamado_historico_update
BEFORE UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_chamado();

-- Histórico de comentários
CREATE OR REPLACE FUNCTION public.registrar_historico_comentario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao)
  VALUES (NEW.chamado_id, NEW.workspace_id, auth.uid(),
    CASE WHEN NEW.interno THEN 'adicionou comentário interno' ELSE 'adicionou comentário' END);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comentario_historico
AFTER INSERT ON public.chamado_comentarios
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_comentario();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_historico ENABLE ROW LEVEL SECURITY;

-- chamados: ver
CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.pode_ver_todos_chamados(workspace_id)
    OR solicitante_id = auth.uid()
    OR criado_por = auth.uid()
  )
);

-- chamados: criar (qualquer membro)
CREATE POLICY chamados_inserir ON public.chamados
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND criado_por = auth.uid()
  AND solicitante_id = auth.uid()
);

-- chamados: atualizar
CREATE POLICY chamados_atualizar ON public.chamados
FOR UPDATE USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.pode_ver_todos_chamados(workspace_id)
    OR (solicitante_id = auth.uid() AND status NOT IN ('Fechado', 'Cancelado'))
  )
);

-- chamados: excluir (admins)
CREATE POLICY chamados_excluir ON public.chamados
FOR DELETE USING (
  public.tem_papel_workspace(workspace_id, ARRAY['Proprietario', 'Administrador']::papel_membro[])
);

-- comentários: ver
CREATE POLICY comentarios_selecionar ON public.chamado_comentarios
FOR SELECT USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    NOT interno
    OR public.pode_ver_todos_chamados(workspace_id)
  )
  AND chamado_id IN (
    SELECT id FROM public.chamados
    WHERE workspace_id IN (SELECT public.workspaces_do_usuario())
      AND (
        public.pode_ver_todos_chamados(workspace_id)
        OR solicitante_id = auth.uid()
        OR criado_por = auth.uid()
      )
  )
);

-- comentários: criar
CREATE POLICY comentarios_inserir ON public.chamado_comentarios
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND autor_id = auth.uid()
  AND (NOT interno OR public.pode_ver_todos_chamados(workspace_id))
);

-- comentários: atualizar/excluir (autor)
CREATE POLICY comentarios_atualizar ON public.chamado_comentarios
FOR UPDATE USING (autor_id = auth.uid());

CREATE POLICY comentarios_excluir ON public.chamado_comentarios
FOR DELETE USING (
  autor_id = auth.uid()
  OR public.tem_papel_workspace(workspace_id, ARRAY['Proprietario', 'Administrador']::papel_membro[])
);

-- anexos
CREATE POLICY anexos_selecionar ON public.chamado_anexos
FOR SELECT USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND chamado_id IN (
    SELECT id FROM public.chamados
    WHERE workspace_id IN (SELECT public.workspaces_do_usuario())
      AND (
        public.pode_ver_todos_chamados(workspace_id)
        OR solicitante_id = auth.uid()
        OR criado_por = auth.uid()
      )
  )
);

CREATE POLICY anexos_inserir ON public.chamado_anexos
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND enviado_por = auth.uid()
);

CREATE POLICY anexos_excluir ON public.chamado_anexos
FOR DELETE USING (
  enviado_por = auth.uid()
  OR public.tem_papel_workspace(workspace_id, ARRAY['Proprietario', 'Administrador']::papel_membro[])
);

-- histórico (somente leitura para membros)
CREATE POLICY historico_selecionar ON public.chamado_historico
FOR SELECT USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND chamado_id IN (
    SELECT id FROM public.chamados
    WHERE workspace_id IN (SELECT public.workspaces_do_usuario())
      AND (
        public.pode_ver_todos_chamados(workspace_id)
        OR solicitante_id = auth.uid()
        OR criado_por = auth.uid()
      )
  )
);

-- ============================================================
-- STORAGE: bucket privado para anexos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chamado-anexos', 'chamado-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- Caminho: {workspace_id}/{chamado_id}/{nome_arquivo}
CREATE POLICY "anexos_storage_selecionar" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chamado-anexos'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.workspaces_do_usuario())
);

CREATE POLICY "anexos_storage_inserir" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chamado-anexos'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.workspaces_do_usuario())
  AND auth.uid() = owner
);

CREATE POLICY "anexos_storage_excluir" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chamado-anexos'
  AND (
    auth.uid() = owner
    OR public.tem_papel_workspace(
      (storage.foldername(name))[1]::uuid,
      ARRAY['Proprietario', 'Administrador']::papel_membro[]
    )
  )
);
