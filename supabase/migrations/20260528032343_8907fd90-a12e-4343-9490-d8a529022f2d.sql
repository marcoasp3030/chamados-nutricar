
-- 1) Override manual de coluna no card de inauguração
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS coluna_manual text;

-- 2) Tabela de funis configuráveis por workspace
CREATE TABLE IF NOT EXISTS public.inauguracao_funis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chave text NOT NULL,
  rotulo text NOT NULL,
  descricao text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, chave)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inauguracao_funis TO authenticated;
GRANT ALL ON public.inauguracao_funis TO service_role;

ALTER TABLE public.inauguracao_funis ENABLE ROW LEVEL SECURITY;

-- Função: usuário atual é super admin?
CREATE OR REPLACE FUNCTION public.eh_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT super_admin FROM public.perfis WHERE id = auth.uid()), false);
$$;

CREATE POLICY "Membros do workspace visualizam funis"
ON public.inauguracao_funis FOR SELECT TO authenticated
USING (workspace_id IN (SELECT public.workspaces_do_usuario()));

CREATE POLICY "Super admin cria funis"
ON public.inauguracao_funis FOR INSERT TO authenticated
WITH CHECK (public.eh_super_admin());

CREATE POLICY "Super admin atualiza funis"
ON public.inauguracao_funis FOR UPDATE TO authenticated
USING (public.eh_super_admin())
WITH CHECK (public.eh_super_admin());

CREATE POLICY "Super admin exclui funis"
ON public.inauguracao_funis FOR DELETE TO authenticated
USING (public.eh_super_admin());

CREATE TRIGGER trg_inauguracao_funis_atualizado
BEFORE UPDATE ON public.inauguracao_funis
FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();
