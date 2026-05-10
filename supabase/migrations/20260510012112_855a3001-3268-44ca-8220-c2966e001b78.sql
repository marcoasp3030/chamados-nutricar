
CREATE TABLE public.checklist_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  autor_id uuid NOT NULL,
  conteudo text NOT NULL,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_comentarios_checklist ON public.checklist_comentarios(checklist_id, criado_em DESC);

ALTER TABLE public.checklist_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_select" ON public.checklist_comentarios
FOR SELECT USING (workspace_id IN (SELECT workspaces_do_usuario()));

CREATE POLICY "cc_insert" ON public.checklist_comentarios
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspaces_do_usuario())
  AND autor_id = auth.uid()
);

CREATE POLICY "cc_update" ON public.checklist_comentarios
FOR UPDATE USING (autor_id = auth.uid());

CREATE POLICY "cc_delete" ON public.checklist_comentarios
FOR DELETE USING (
  autor_id = auth.uid()
  OR tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
);

CREATE TRIGGER trg_cc_atualizado_em
BEFORE UPDATE ON public.checklist_comentarios
FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();
