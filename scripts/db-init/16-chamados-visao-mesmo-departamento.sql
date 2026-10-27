-- Visão de chamados por colegas do MESMO departamento do solicitante.
-- Pedido: se a Bianca (Comercial) abre um chamado, todos os funcionários do
-- Comercial devem enxergar esse chamado — mesmo que o destino seja outro setor.
--
-- A policy anterior (11-chamados-visibilidade-depto) só mostrava o chamado para:
--   Prop/Admin, o próprio solicitante, ou quem é do departamento de DESTINO.
-- Aqui adicionamos: quem compartilha algum departamento com o SOLICITANTE.
-- Idempotente.

-- Função auxiliar: o usuário logado (auth.uid()) compartilha pelo menos um
-- departamento (ativo) com o usuário-alvo, dentro do workspace informado?
-- SECURITY DEFINER para poder ler os vínculos de outros membros sem esbarrar na RLS.
CREATE OR REPLACE FUNCTION public.compartilha_departamento(
  _workspace_id uuid,
  _usuario_alvo uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_membro_departamentos wmd_alvo
    JOIN public.workspace_membros wm_alvo
      ON wm_alvo.id = wmd_alvo.membro_id
    WHERE wm_alvo.workspace_id = _workspace_id
      AND wm_alvo.usuario_id = _usuario_alvo
      AND wm_alvo.ativo = true
      AND wmd_alvo.departamento_id IN (
        SELECT public.departamentos_do_usuario(_workspace_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.compartilha_departamento(uuid, uuid)
  TO anon, authenticated;

DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;

CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.tem_papel_workspace(
      workspace_id,
      ARRAY['Proprietario'::papel_membro, 'Administrador'::papel_membro]
    )
    -- O próprio solicitante
    OR solicitante_id = auth.uid()
    -- Quem é do departamento de DESTINO do chamado
    OR (
      departamento_id IS NOT NULL
      AND departamento_id IN (SELECT public.departamentos_do_usuario(chamados.workspace_id))
    )
    -- NOVO: colegas do MESMO departamento do solicitante
    OR (
      solicitante_id IS NOT NULL
      AND public.compartilha_departamento(chamados.workspace_id, solicitante_id)
    )
  )
);
