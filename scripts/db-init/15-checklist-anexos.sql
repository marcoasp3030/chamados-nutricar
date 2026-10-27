-- Anexos (imagens/arquivos) de checklists. Espelha o desenho de public.chamado_anexos.
-- Os arquivos em si ficam no storage (bucket "checklist-anexos"); aqui guardamos só os metadados.
-- Idempotente: pode rodar várias vezes sem efeito colateral.

CREATE TABLE IF NOT EXISTS public.checklist_anexos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL,
  checklist_id    uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  enviado_por     uuid NOT NULL,
  nome_arquivo    text NOT NULL,
  caminho_storage text NOT NULL,
  tipo_mime       text,
  tamanho_bytes   bigint NOT NULL DEFAULT 0,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_anexos_checklist
  ON public.checklist_anexos (checklist_id);

ALTER TABLE public.checklist_anexos ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer membro do workspace que enxerga o checklist (mesma visibilidade de public.checklists).
DROP POLICY IF EXISTS checklist_anexos_selecionar ON public.checklist_anexos;
CREATE POLICY checklist_anexos_selecionar ON public.checklist_anexos
  FOR SELECT
  USING (
    workspace_id IN (SELECT workspaces_do_usuario())
    AND checklist_id IN (
      SELECT id FROM public.checklists
      WHERE workspace_id IN (SELECT workspaces_do_usuario())
    )
  );

-- INSERT: precisa ser membro do workspace e registrar a si mesmo como remetente.
DROP POLICY IF EXISTS checklist_anexos_inserir ON public.checklist_anexos;
CREATE POLICY checklist_anexos_inserir ON public.checklist_anexos
  FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspaces_do_usuario())
    AND enviado_por = auth.uid()
  );

-- DELETE: quem enviou ou administradores/proprietários do workspace.
DROP POLICY IF EXISTS checklist_anexos_excluir ON public.checklist_anexos;
CREATE POLICY checklist_anexos_excluir ON public.checklist_anexos
  FOR DELETE
  USING (
    enviado_por = auth.uid()
    OR tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
  );

-- Acesso via PostgREST (RLS continua restringindo as linhas).
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.checklist_anexos TO anon, authenticated;

-- Recarrega o schema cache do PostgREST.
NOTIFY pgrst, 'reload schema';
