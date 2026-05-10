
-- 1) Novos valores no enum status_chamado
ALTER TYPE public.status_chamado ADD VALUE IF NOT EXISTS 'Agendado';
ALTER TYPE public.status_chamado ADD VALUE IF NOT EXISTS 'Pausado';

-- 2) Novas colunas em chamados
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS departamento_origem_id uuid,
  ADD COLUMN IF NOT EXISTS motivo_agendamento text,
  ADD COLUMN IF NOT EXISTS agendado_para timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_pausa text,
  ADD COLUMN IF NOT EXISTS tratativa text;

-- 3) Função: lista de departamentos do usuário no workspace
CREATE OR REPLACE FUNCTION public.departamentos_do_usuario(_workspace_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wmd.departamento_id
  FROM public.workspace_membro_departamentos wmd
  JOIN public.workspace_membros wm ON wm.id = wmd.membro_id
  WHERE wm.workspace_id = _workspace_id
    AND wm.usuario_id = auth.uid()
    AND wm.ativo = true
$$;

-- 4) Trigger: preenche departamento_origem_id ao inserir chamado
CREATE OR REPLACE FUNCTION public.preencher_departamento_origem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _depto uuid;
BEGIN
  IF NEW.departamento_origem_id IS NULL THEN
    SELECT wmd.departamento_id INTO _depto
    FROM public.workspace_membro_departamentos wmd
    JOIN public.workspace_membros wm ON wm.id = wmd.membro_id
    WHERE wm.workspace_id = NEW.workspace_id
      AND wm.usuario_id = NEW.solicitante_id
      AND wm.ativo = true
    LIMIT 1;
    NEW.departamento_origem_id := _depto;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preencher_departamento_origem ON public.chamados;
CREATE TRIGGER trg_preencher_departamento_origem
  BEFORE INSERT ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.preencher_departamento_origem();

-- 5) Trigger: valida transições e exige campos obrigatórios
CREATE OR REPLACE FUNCTION public.validar_transicao_status_chamado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Para sair de "Aberto" precisa ter responsável (exceto Cancelado/Fechado)
    IF OLD.status = 'Aberto'
       AND NEW.status NOT IN ('Aberto','Cancelado','Fechado')
       AND NEW.responsavel_id IS NULL THEN
      RAISE EXCEPTION 'É necessário atribuir um responsável antes de iniciar a resolução.';
    END IF;

    IF NEW.status = 'Agendado' THEN
      IF NEW.motivo_agendamento IS NULL OR length(trim(NEW.motivo_agendamento)) = 0 THEN
        RAISE EXCEPTION 'Informe o motivo do agendamento.';
      END IF;
      IF NEW.agendado_para IS NULL THEN
        RAISE EXCEPTION 'Informe a data do agendamento.';
      END IF;
    END IF;

    IF NEW.status = 'Pausado' THEN
      IF NEW.motivo_pausa IS NULL OR length(trim(NEW.motivo_pausa)) = 0 THEN
        RAISE EXCEPTION 'Informe o motivo da pausa.';
      END IF;
    END IF;

    IF NEW.status = 'Resolvido' THEN
      IF NEW.tratativa IS NULL OR length(trim(NEW.tratativa)) = 0 THEN
        RAISE EXCEPTION 'Informe a tratativa realizada antes de resolver.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_transicao_status_chamado ON public.chamados;
CREATE TRIGGER trg_validar_transicao_status_chamado
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.validar_transicao_status_chamado();

-- 6) Reescreve policies de chamados
DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;
CREATE POLICY chamados_selecionar ON public.chamados
FOR SELECT
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro])
    OR solicitante_id = auth.uid()
    OR criado_por = auth.uid()
    OR responsavel_id = auth.uid()
    OR (departamento_id IS NOT NULL AND departamento_id IN (SELECT public.departamentos_do_usuario(workspace_id)))
    OR (departamento_origem_id IS NOT NULL AND departamento_origem_id IN (SELECT public.departamentos_do_usuario(workspace_id)))
  )
);

DROP POLICY IF EXISTS chamados_atualizar ON public.chamados;
CREATE POLICY chamados_atualizar ON public.chamados
FOR UPDATE
USING (
  workspace_id IN (SELECT public.workspaces_do_usuario())
  AND (
    public.tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro,'Gestor'::papel_membro,'Atendente'::papel_membro])
    OR (solicitante_id = auth.uid() AND status NOT IN ('Fechado'::status_chamado,'Cancelado'::status_chamado))
    OR (departamento_id IS NOT NULL AND departamento_id IN (SELECT public.departamentos_do_usuario(workspace_id)))
  )
);
