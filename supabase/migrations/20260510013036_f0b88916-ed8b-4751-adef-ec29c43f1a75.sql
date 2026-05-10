
ALTER TABLE public.checklist_comentarios
  ADD COLUMN IF NOT EXISTS mencionados uuid[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  destinatario_id uuid NOT NULL,
  ator_id uuid,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text,
  link text,
  recurso_tipo text,
  recurso_id uuid,
  lida_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_dest_lida ON public.notificacoes (destinatario_id, lida_em, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notif_ws ON public.notificacoes (workspace_id);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_select ON public.notificacoes
  FOR SELECT USING (destinatario_id = auth.uid());

CREATE POLICY notif_insert ON public.notificacoes
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT public.workspaces_do_usuario())
  );

CREATE POLICY notif_update ON public.notificacoes
  FOR UPDATE USING (destinatario_id = auth.uid());

CREATE POLICY notif_delete ON public.notificacoes
  FOR DELETE USING (destinatario_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
