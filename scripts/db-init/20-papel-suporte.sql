-- Papel Suporte: técnicos/manutenção — veem e atuam SOMENTE em chamados atribuídos a eles.
-- Idempotente.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'papel_membro'
      AND e.enumlabel = 'Suporte'
  ) THEN
    ALTER TYPE public.papel_membro ADD VALUE 'Suporte' AFTER 'Atendente';
  END IF;
END
$$;

-- Membro ativo com papel exclusivo Suporte (sem papéis operacionais superiores).
CREATE OR REPLACE FUNCTION public.tem_papel_apenas_suporte(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_membros
    WHERE workspace_id = _workspace_id
      AND usuario_id = auth.uid()
      AND ativo = true
      AND papel = 'Suporte'::public.papel_membro
  );
$$;

GRANT EXECUTE ON FUNCTION public.tem_papel_apenas_suporte(uuid)
  TO anon, authenticated;

-- Suporte NÃO entra em "ver todos os chamados".
CREATE OR REPLACE FUNCTION public.pode_ver_todos_chamados(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_membros
    WHERE workspace_id = _workspace_id
      AND usuario_id = auth.uid()
      AND ativo = true
      AND papel IN (
        'Proprietario'::public.papel_membro,
        'Administrador'::public.papel_membro,
        'Gestor'::public.papel_membro,
        'Atendente'::public.papel_membro
      )
  );
$$;

DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;

CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    (
      public.tem_papel_apenas_suporte(workspace_id)
      AND responsavel_id = auth.uid()
    )
    OR (
      NOT public.tem_papel_apenas_suporte(workspace_id)
      AND (
        public.tem_papel_workspace(
          workspace_id,
          ARRAY['Proprietario'::public.papel_membro, 'Administrador'::public.papel_membro]
        )
        OR solicitante_id = auth.uid()
        OR (
          departamento_id IS NOT NULL
          AND departamento_id IN (
            SELECT public.departamentos_do_usuario(chamados.workspace_id)
          )
        )
        OR (
          solicitante_id IS NOT NULL
          AND public.compartilha_departamento(chamados.workspace_id, solicitante_id)
        )
      )
    )
  )
);

DROP POLICY IF EXISTS chamados_atualizar ON public.chamados;

CREATE POLICY chamados_atualizar ON public.chamados
FOR UPDATE
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    (
      public.tem_papel_apenas_suporte(workspace_id)
      AND responsavel_id = auth.uid()
    )
    OR (
      NOT public.tem_papel_apenas_suporte(workspace_id)
      AND (
        public.tem_papel_workspace(
          workspace_id,
          ARRAY[
            'Proprietario'::public.papel_membro,
            'Administrador'::public.papel_membro,
            'Gestor'::public.papel_membro,
            'Atendente'::public.papel_membro
          ]
        )
        OR (
          solicitante_id = auth.uid()
          AND status <> ALL (ARRAY['Fechado'::public.status_chamado, 'Cancelado'::public.status_chamado])
        )
        OR (
          departamento_id IS NOT NULL
          AND departamento_id IN (
            SELECT public.departamentos_do_usuario(chamados.workspace_id)
          )
        )
      )
    )
  )
);
