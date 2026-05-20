CREATE TABLE public.kanban_funis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#64748b',
  ordem integer NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'status' CHECK (tipo IN ('status','filtro')),
  status_origem status_chamado NULL,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kanban_funis_usuario_ws ON public.kanban_funis(usuario_id, workspace_id, ordem);

ALTER TABLE public.kanban_funis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funis_selecionar_proprio" ON public.kanban_funis
  FOR SELECT USING (usuario_id = auth.uid() AND workspace_id IN (SELECT workspaces_do_usuario()));

CREATE POLICY "funis_inserir_proprio" ON public.kanban_funis
  FOR INSERT WITH CHECK (usuario_id = auth.uid() AND workspace_id IN (SELECT workspaces_do_usuario()));

CREATE POLICY "funis_atualizar_proprio" ON public.kanban_funis
  FOR UPDATE USING (usuario_id = auth.uid());

CREATE POLICY "funis_excluir_proprio" ON public.kanban_funis
  FOR DELETE USING (usuario_id = auth.uid());

CREATE TRIGGER trg_kanban_funis_atualizado
  BEFORE UPDATE ON public.kanban_funis
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();