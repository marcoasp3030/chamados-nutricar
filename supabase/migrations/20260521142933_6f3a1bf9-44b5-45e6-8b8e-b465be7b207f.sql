
-- Tabelas primeiro
CREATE TABLE public.inventario_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  departamento_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  unidade text,
  quantidade numeric NOT NULL DEFAULT 0,
  quantidade_minima numeric NOT NULL DEFAULT 0,
  localizacao text,
  loja text,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_itens_ws_dep ON public.inventario_itens(workspace_id, departamento_id);

CREATE TABLE public.inventario_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.inventario_itens(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade numeric NOT NULL,
  motivo text,
  usuario_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_mov_item ON public.inventario_movimentacoes(item_id);

CREATE TABLE public.inventario_compartilhamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  departamento_dono_id uuid NOT NULL,
  departamento_compartilhado_id uuid NOT NULL,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (departamento_dono_id, departamento_compartilhado_id),
  CHECK (departamento_dono_id <> departamento_compartilhado_id)
);
CREATE INDEX idx_inv_compart_ws ON public.inventario_compartilhamentos(workspace_id);

-- Helpers
CREATE OR REPLACE FUNCTION public.eh_membro_departamento(_workspace_id uuid, _departamento_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_membro_departamentos wmd
    JOIN public.workspace_membros wm ON wm.id = wmd.membro_id
    WHERE wm.workspace_id = _workspace_id AND wm.usuario_id = auth.uid()
      AND wm.ativo = true AND wmd.departamento_id = _departamento_id
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_inventario_departamento(_workspace_id uuid, _departamento_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    public.tem_papel_workspace(_workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
    OR public.eh_membro_departamento(_workspace_id, _departamento_id)
    OR EXISTS (
      SELECT 1 FROM public.inventario_compartilhamentos ic
      WHERE ic.workspace_id = _workspace_id
        AND ic.departamento_dono_id = _departamento_id
        AND ic.departamento_compartilhado_id IN (SELECT public.departamentos_do_usuario(_workspace_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.pode_editar_inventario_departamento(_workspace_id uuid, _departamento_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    public.tem_papel_workspace(_workspace_id, ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro])
    OR public.eh_membro_departamento(_workspace_id, _departamento_id);
$$;

-- RLS
ALTER TABLE public.inventario_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_compartilhamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY inv_itens_select ON public.inventario_itens FOR SELECT
USING (workspace_id IN (SELECT public.workspaces_do_usuario())
       AND public.pode_ver_inventario_departamento(workspace_id, departamento_id));
CREATE POLICY inv_itens_insert ON public.inventario_itens FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.workspaces_do_usuario())
            AND criado_por = auth.uid()
            AND public.pode_editar_inventario_departamento(workspace_id, departamento_id));
CREATE POLICY inv_itens_update ON public.inventario_itens FOR UPDATE
USING (public.pode_editar_inventario_departamento(workspace_id, departamento_id));
CREATE POLICY inv_itens_delete ON public.inventario_itens FOR DELETE
USING (public.pode_editar_inventario_departamento(workspace_id, departamento_id));

CREATE POLICY inv_mov_select ON public.inventario_movimentacoes FOR SELECT
USING (workspace_id IN (SELECT public.workspaces_do_usuario())
       AND item_id IN (SELECT id FROM public.inventario_itens
                       WHERE public.pode_ver_inventario_departamento(workspace_id, departamento_id)));
CREATE POLICY inv_mov_insert ON public.inventario_movimentacoes FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.workspaces_do_usuario())
            AND usuario_id = auth.uid()
            AND item_id IN (SELECT id FROM public.inventario_itens
                            WHERE public.pode_editar_inventario_departamento(workspace_id, departamento_id)));
CREATE POLICY inv_mov_delete ON public.inventario_movimentacoes FOR DELETE
USING (item_id IN (SELECT id FROM public.inventario_itens
                   WHERE public.pode_editar_inventario_departamento(workspace_id, departamento_id)));

CREATE POLICY inv_compart_select ON public.inventario_compartilhamentos FOR SELECT
USING (workspace_id IN (SELECT public.workspaces_do_usuario()));
CREATE POLICY inv_compart_insert ON public.inventario_compartilhamentos FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.workspaces_do_usuario())
            AND criado_por = auth.uid()
            AND public.pode_editar_inventario_departamento(workspace_id, departamento_dono_id));
CREATE POLICY inv_compart_delete ON public.inventario_compartilhamentos FOR DELETE
USING (public.pode_editar_inventario_departamento(workspace_id, departamento_dono_id));

-- Trigger atualizado_em
CREATE TRIGGER trg_inv_itens_atualizado
BEFORE UPDATE ON public.inventario_itens
FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

-- Aplicar movimentações na quantidade
CREATE OR REPLACE FUNCTION public.aplicar_movimentacao_inventario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.inventario_itens SET quantidade = quantidade + NEW.quantidade WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.inventario_itens SET quantidade = GREATEST(0, quantidade - NEW.quantidade) WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public.inventario_itens SET quantidade = NEW.quantidade WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aplicar_mov_inventario
AFTER INSERT ON public.inventario_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimentacao_inventario();
