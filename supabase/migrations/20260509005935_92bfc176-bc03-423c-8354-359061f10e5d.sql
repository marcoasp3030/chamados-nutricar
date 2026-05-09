
CREATE TABLE public.chamado_ia_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  usuario_id UUID,
  acao TEXT NOT NULL,
  modelo TEXT,
  resultado TEXT,
  erro TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ia_execucoes_chamado ON public.chamado_ia_execucoes(chamado_id, criado_em DESC);

ALTER TABLE public.chamado_ia_execucoes ENABLE ROW LEVEL SECURITY;

-- Mesma regra de visibilidade do histórico do chamado
CREATE POLICY ia_execucoes_selecionar ON public.chamado_ia_execucoes
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
-- Sem políticas de INSERT/UPDATE/DELETE: somente service role grava.
