
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS requisicao_compras boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.chamado_requisicao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text,
  descricao text NOT NULL,
  referencia text,
  data_necessidade date,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chamado_req_itens_chamado_idx ON public.chamado_requisicao_itens(chamado_id);

ALTER TABLE public.chamado_requisicao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY req_itens_selecionar ON public.chamado_requisicao_itens
FOR SELECT USING (
  workspace_id IN (SELECT workspaces_do_usuario())
  AND chamado_id IN (
    SELECT id FROM public.chamados
    WHERE workspace_id IN (SELECT workspaces_do_usuario())
      AND (pode_ver_todos_chamados(workspace_id) OR solicitante_id = auth.uid() OR criado_por = auth.uid())
  )
);

CREATE POLICY req_itens_inserir ON public.chamado_requisicao_itens
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspaces_do_usuario())
  AND criado_por = auth.uid()
  AND chamado_id IN (
    SELECT id FROM public.chamados
    WHERE workspace_id IN (SELECT workspaces_do_usuario())
      AND (pode_ver_todos_chamados(workspace_id) OR solicitante_id = auth.uid() OR criado_por = auth.uid())
  )
);

CREATE POLICY req_itens_atualizar ON public.chamado_requisicao_itens
FOR UPDATE USING (
  workspace_id IN (SELECT workspaces_do_usuario())
  AND chamado_id IN (
    SELECT id FROM public.chamados
    WHERE pode_ver_todos_chamados(workspace_id) OR solicitante_id = auth.uid() OR criado_por = auth.uid()
  )
);

CREATE POLICY req_itens_excluir ON public.chamado_requisicao_itens
FOR DELETE USING (
  workspace_id IN (SELECT workspaces_do_usuario())
  AND chamado_id IN (
    SELECT id FROM public.chamados
    WHERE pode_ver_todos_chamados(workspace_id) OR solicitante_id = auth.uid() OR criado_por = auth.uid()
  )
);

CREATE TRIGGER set_atualizado_em_req_itens
BEFORE UPDATE ON public.chamado_requisicao_itens
FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();
