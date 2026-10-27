-- Atribuir a mim → Em andamento; reabertura pelo solicitante (5 dias); fechamento automático.
-- Idempotente.

CREATE OR REPLACE FUNCTION public.prazo_reabertura_chamado()
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT interval '5 days';
$$;

-- Ao assumir responsável com status Aberto, passa para Em andamento.
CREATE OR REPLACE FUNCTION public.ao_atribuir_responsavel_chamado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.responsavel_id IS NOT NULL
     AND NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id
     AND NEW.status = 'Aberto' THEN
    NEW.status := 'Em andamento';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ao_atribuir_responsavel_chamado ON public.chamados;
CREATE TRIGGER trg_ao_atribuir_responsavel_chamado
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.ao_atribuir_responsavel_chamado();

-- Fecha chamados resolvidos há mais de 5 dias (fuso Brasília).
CREATE OR REPLACE FUNCTION public.fechar_chamados_resolvidos_expirados(
  _workspace_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _qtd integer;
BEGIN
  UPDATE public.chamados
  SET status = 'Fechado'
  WHERE status = 'Resolvido'
    AND resolvido_em IS NOT NULL
    AND resolvido_em <= timezone('America/Sao_Paulo', now()) - public.prazo_reabertura_chamado()
    AND (_workspace_id IS NULL OR workspace_id = _workspace_id);

  GET DIAGNOSTICS _qtd = ROW_COUNT;
  RETURN _qtd;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fechar_chamados_resolvidos_expirados(uuid)
  TO anon, authenticated;

-- Validações de transição (reabertura + bloqueios).
CREATE OR REPLACE FUNCTION public.validar_transicao_status_chamado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _agora timestamptz;
BEGIN
  _agora := timezone('America/Sao_Paulo', now());

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Chamado resolvido expirado: só pode ir para Fechado.
    IF OLD.status = 'Resolvido'
       AND OLD.resolvido_em IS NOT NULL
       AND OLD.resolvido_em <= _agora - public.prazo_reabertura_chamado()
       AND NEW.status IS DISTINCT FROM 'Fechado' THEN
      RAISE EXCEPTION 'O prazo de 5 dias para reabrir este chamado expirou. Ele será fechado automaticamente.';
    END IF;

    -- Reabertura: somente o solicitante, de Resolvido → Aberto, dentro do prazo.
    IF OLD.status = 'Resolvido' AND NEW.status = 'Aberto' THEN
      IF auth.uid() IS DISTINCT FROM OLD.solicitante_id THEN
        RAISE EXCEPTION 'Somente quem abriu o chamado pode reabri-lo.';
      END IF;
      IF OLD.resolvido_em IS NULL
         OR OLD.resolvido_em <= _agora - public.prazo_reabertura_chamado() THEN
        RAISE EXCEPTION 'O prazo de 5 dias para reabrir este chamado já expirou.';
      END IF;
    END IF;

    -- Para sair de "Aberto" precisa ter responsável (exceto Cancelado/Fechado).
    IF OLD.status = 'Aberto'
       AND NEW.status NOT IN ('Aberto', 'Cancelado', 'Fechado')
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
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_transicao_status_chamado();
