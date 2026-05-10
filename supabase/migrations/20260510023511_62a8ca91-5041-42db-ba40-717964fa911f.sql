CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============ app_config ============
CREATE TABLE IF NOT EXISTS public.app_config (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- (sem policies → nenhum acesso direto de clientes)

INSERT INTO public.app_config (chave, valor)
VALUES ('whatsapp_notify_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (chave) DO NOTHING;

INSERT INTO public.app_config (chave, valor)
VALUES ('whatsapp_notify_url',
  'https://project--98165f9e-498c-4810-868e-07ed8362bbd9.lovable.app/api/public/whatsapp-notify')
ON CONFLICT (chave) DO NOTHING;

-- ============ tabela de log/dedup ============
CREATE TABLE IF NOT EXISTS public.chamado_whatsapp_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  chamado_id uuid NOT NULL,
  evento text NOT NULL,
  destinatario_perfil_id uuid NOT NULL,
  telefone text NOT NULL,
  mensagem text,
  sucesso boolean NOT NULL DEFAULT false,
  status_http integer,
  erro text,
  dedup_key text NOT NULL UNIQUE,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chamado_whatsapp_notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_notif_select ON public.chamado_whatsapp_notificacoes
  FOR SELECT USING (
    tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
  );

CREATE INDEX IF NOT EXISTS idx_whatsapp_notif_chamado
  ON public.chamado_whatsapp_notificacoes (chamado_id, criado_em DESC);

-- ============ função genérica de disparo ============
CREATE OR REPLACE FUNCTION public.disparar_whatsapp_chamado(
  _workspace_id uuid,
  _chamado_id uuid,
  _evento text,
  _ator_id uuid,
  _comentario_id uuid DEFAULT NULL,
  _detalhes jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _secret text;
  _url text;
BEGIN
  SELECT valor INTO _secret FROM public.app_config WHERE chave = 'whatsapp_notify_secret';
  SELECT valor INTO _url    FROM public.app_config WHERE chave = 'whatsapp_notify_url';
  IF _secret IS NULL OR _url IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _secret
    ),
    body := jsonb_build_object(
      'workspace_id', _workspace_id,
      'chamado_id',   _chamado_id,
      'evento',       _evento,
      'ator_id',      _ator_id,
      'comentario_id',_comentario_id,
      'detalhes',     _detalhes
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- nunca bloquear a transação original
  NULL;
END;
$$;

-- ============ triggers em chamados ============
CREATE OR REPLACE FUNCTION public.tg_chamado_whatsapp_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.disparar_whatsapp_chamado(
    NEW.workspace_id, NEW.id, 'criado', NEW.criado_por
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chamados_whatsapp_after_insert ON public.chamados;
CREATE TRIGGER chamados_whatsapp_after_insert
AFTER INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.tg_chamado_whatsapp_insert();

CREATE OR REPLACE FUNCTION public.tg_chamado_whatsapp_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ator uuid := auth.uid();
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.disparar_whatsapp_chamado(
      NEW.workspace_id, NEW.id,
      CASE NEW.status::text
        WHEN 'Resolvido' THEN 'resolvido'
        WHEN 'Pausado'   THEN 'pausado'
        WHEN 'Agendado'  THEN 'agendado'
        WHEN 'Fechado'   THEN 'fechado'
        WHEN 'Cancelado' THEN 'cancelado'
        ELSE 'status'
      END,
      _ator, NULL,
      jsonb_build_object('de', OLD.status, 'para', NEW.status)
    );
  END IF;
  IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
    PERFORM public.disparar_whatsapp_chamado(
      NEW.workspace_id, NEW.id, 'responsavel', _ator, NULL,
      jsonb_build_object('de', OLD.responsavel_id, 'para', NEW.responsavel_id)
    );
  END IF;
  IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
    PERFORM public.disparar_whatsapp_chamado(
      NEW.workspace_id, NEW.id, 'prioridade', _ator, NULL,
      jsonb_build_object('de', OLD.prioridade, 'para', NEW.prioridade)
    );
  END IF;
  IF NEW.departamento_id IS DISTINCT FROM OLD.departamento_id THEN
    PERFORM public.disparar_whatsapp_chamado(
      NEW.workspace_id, NEW.id, 'departamento', _ator, NULL,
      jsonb_build_object('de', OLD.departamento_id, 'para', NEW.departamento_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chamados_whatsapp_after_update ON public.chamados;
CREATE TRIGGER chamados_whatsapp_after_update
AFTER UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.tg_chamado_whatsapp_update();

-- ============ trigger em comentários ============
CREATE OR REPLACE FUNCTION public.tg_comentario_whatsapp_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.interno THEN
    RETURN NEW;
  END IF;
  PERFORM public.disparar_whatsapp_chamado(
    NEW.workspace_id, NEW.chamado_id, 'comentario', NEW.autor_id, NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chamado_comentarios_whatsapp_after_insert ON public.chamado_comentarios;
CREATE TRIGGER chamado_comentarios_whatsapp_after_insert
AFTER INSERT ON public.chamado_comentarios
FOR EACH ROW EXECUTE FUNCTION public.tg_comentario_whatsapp_insert();