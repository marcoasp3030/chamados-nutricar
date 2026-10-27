-- Gerado automaticamente a partir de supabase/migrations
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;


-- from 20260509002041_d0948169-5c0b-4c75-913d-d6017ca6fa7b.sql
CREATE OR REPLACE FUNCTION public.workspaces_do_usuario()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.workspace_membros
  WHERE usuario_id = auth.uid()
    AND ativo = true;
$$;

-- from 20260509002041_d0948169-5c0b-4c75-913d-d6017ca6fa7b.sql
CREATE OR REPLACE FUNCTION public.tem_papel_workspace(_workspace_id uuid, _papeis public.papel_membro[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_membros
    WHERE workspace_id = _workspace_id
      AND usuario_id = auth.uid()
      AND ativo = true
      AND papel = ANY(_papeis)
  );
$$;

-- from 20260509002041_d0948169-5c0b-4c75-913d-d6017ca6fa7b.sql
CREATE OR REPLACE FUNCTION public.atualizar_coluna_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- from 20260509002041_d0948169-5c0b-4c75-913d-d6017ca6fa7b.sql
CREATE OR REPLACE FUNCTION public.criar_perfil_novo_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_convites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis_selecionar_proprio"
CREATE POLICY "perfis_selecionar_colegas_workspace"
CREATE POLICY "perfis_atualizar_proprio"
CREATE POLICY "workspaces_selecionar_membros"
CREATE POLICY "workspaces_inserir_autenticados"
CREATE POLICY "workspaces_atualizar_admins"
CREATE POLICY "workspaces_excluir_proprietario"
CREATE POLICY "membros_selecionar_mesma_empresa"
CREATE POLICY "membros_inserir_admins"
CREATE POLICY "membros_atualizar_admins"
CREATE POLICY "membros_excluir_admins"
CREATE POLICY "convites_selecionar_admins"
CREATE POLICY "convites_selecionar_destinatario"
CREATE POLICY "convites_inserir_admins"
CREATE POLICY "convites_atualizar_admins"
CREATE POLICY "convites_excluir_admins"

-- from 20260509002103_dc47cf9f-8954-431e-9c89-5db879253122.sql
CREATE OR REPLACE FUNCTION public.atualizar_coluna_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- from 20260509003400_400f925f-17c9-4b3b-8834-244aea47c3cd.sql
CREATE OR REPLACE FUNCTION public.pode_ver_todos_chamados(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_membros
    WHERE workspace_id = _workspace_id
      AND usuario_id = auth.uid()
      AND ativo = true
      AND papel IN ('Proprietario', 'Administrador', 'Gestor', 'Atendente')
  );
$$;

-- from 20260509003400_400f925f-17c9-4b3b-8834-244aea47c3cd.sql
CREATE OR REPLACE FUNCTION public.gerar_numero_chamado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proximo INTEGER;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    SELECT COALESCE(MAX(numero), 0) + 1 INTO proximo
    FROM public.chamados
    WHERE workspace_id = NEW.workspace_id;
    NEW.numero := proximo;
  END IF;
  RETURN NEW;
END;
$$;

-- from 20260509003400_400f925f-17c9-4b3b-8834-244aea47c3cd.sql
CREATE OR REPLACE FUNCTION public.registrar_historico_chamado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao)
    VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'criou o chamado');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou o status', 'status', OLD.status::text, NEW.status::text);
    END IF;

    IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou a prioridade', 'prioridade', OLD.prioridade::text, NEW.prioridade::text);
    END IF;

    IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou o responsável', 'responsavel_id',
        COALESCE(OLD.responsavel_id::text, ''), COALESCE(NEW.responsavel_id::text, ''));
    END IF;

    IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou o título', 'titulo', OLD.titulo, NEW.titulo);
    END IF;

    IF NEW.prazo IS DISTINCT FROM OLD.prazo THEN
      INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.workspace_id, auth.uid(), 'alterou o prazo', 'prazo',
        COALESCE(OLD.prazo::text, ''), COALESCE(NEW.prazo::text, ''));
    END IF;

    -- Marcar resolvido_em / fechado_em automaticamente
    IF NEW.status = 'Resolvido' AND OLD.status IS DISTINCT FROM 'Resolvido' THEN
      NEW.resolvido_em := now();
    END IF;
    IF NEW.status = 'Fechado' AND OLD.status IS DISTINCT FROM 'Fechado' THEN
      NEW.fechado_em := now();
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- from 20260509003400_400f925f-17c9-4b3b-8834-244aea47c3cd.sql
CREATE OR REPLACE FUNCTION public.registrar_historico_comentario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chamado_historico (chamado_id, workspace_id, usuario_id, acao)
  VALUES (NEW.chamado_id, NEW.workspace_id, auth.uid(),
    CASE WHEN NEW.interno THEN 'adicionou comentário interno' ELSE 'adicionou comentário' END);
  RETURN NEW;
END;
$$;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY chamados_selecionar ON public.chamados
CREATE POLICY chamados_inserir ON public.chamados
CREATE POLICY chamados_atualizar ON public.chamados
CREATE POLICY chamados_excluir ON public.chamados
CREATE POLICY comentarios_selecionar ON public.chamado_comentarios
CREATE POLICY comentarios_inserir ON public.chamado_comentarios
CREATE POLICY comentarios_atualizar ON public.chamado_comentarios
CREATE POLICY comentarios_excluir ON public.chamado_comentarios
CREATE POLICY anexos_selecionar ON public.chamado_anexos
CREATE POLICY anexos_inserir ON public.chamado_anexos
CREATE POLICY anexos_excluir ON public.chamado_anexos
CREATE POLICY historico_selecionar ON public.chamado_historico
CREATE POLICY "anexos_storage_selecionar" ON storage.objects
CREATE POLICY "anexos_storage_inserir" ON storage.objects
CREATE POLICY "anexos_storage_excluir" ON storage.objects

-- trigger from 20260509003400_400f925f-17c9-4b3b-8834-244aea47c3cd.sql
CREATE TRIGGER trg_chamado_numero
BEFORE INSERT ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.gerar_numero_chamado();

-- trigger from 20260509003400_400f925f-17c9-4b3b-8834-244aea47c3cd.sql
CREATE TRIGGER trg_chamado_historico_insert
AFTER INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_chamado();

-- trigger from 20260509003400_400f925f-17c9-4b3b-8834-244aea47c3cd.sql
CREATE TRIGGER trg_chamado_historico_update
BEFORE UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_chamado();

-- trigger from 20260509003400_400f925f-17c9-4b3b-8834-244aea47c3cd.sql
CREATE TRIGGER trg_comentario_historico
AFTER INSERT ON public.chamado_comentarios
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_comentario();
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY projetos_selecionar ON public.projetos
CREATE POLICY projetos_inserir ON public.projetos
CREATE POLICY projetos_atualizar ON public.projetos
CREATE POLICY projetos_excluir ON public.projetos
CREATE POLICY tarefas_selecionar ON public.tarefas
CREATE POLICY tarefas_inserir ON public.tarefas
CREATE POLICY tarefas_atualizar ON public.tarefas
CREATE POLICY tarefas_excluir ON public.tarefas
ALTER TABLE public.workspace_ia_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY ia_config_selecionar ON public.workspace_ia_config
CREATE POLICY ia_config_inserir ON public.workspace_ia_config
CREATE POLICY ia_config_atualizar ON public.workspace_ia_config
CREATE POLICY ia_config_excluir ON public.workspace_ia_config
ALTER TABLE public.chamado_ia_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ia_execucoes_selecionar ON public.chamado_ia_execucoes
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departamentos_selecionar"
CREATE POLICY "departamentos_inserir"
CREATE POLICY "departamentos_atualizar"
CREATE POLICY "departamentos_excluir"
CREATE POLICY "perfis_atualizar_admins_workspace"
ALTER TABLE public.categorias_chamado ENABLE ROW LEVEL SECURITY;
CREATE POLICY categorias_selecionar ON public.categorias_chamado
CREATE POLICY categorias_inserir ON public.categorias_chamado
CREATE POLICY categorias_atualizar ON public.categorias_chamado
CREATE POLICY categorias_excluir ON public.categorias_chamado
ALTER TABLE public.workspace_vmpay_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY vmpay_config_selecionar ON public.workspace_vmpay_config
CREATE POLICY vmpay_config_inserir ON public.workspace_vmpay_config
CREATE POLICY vmpay_config_atualizar ON public.workspace_vmpay_config
CREATE POLICY vmpay_config_excluir ON public.workspace_vmpay_config

-- from 20260509020948_af7b8b6c-d47a-42c3-93e5-a84cb905f92b.sql
CREATE OR REPLACE FUNCTION public.calcular_sigla_workspace(_nome text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  palavras text[];
  sigla text := '';
  p text;
BEGIN
  IF _nome IS NULL OR length(trim(_nome)) = 0 THEN
    RETURN 'CH';
  END IF;
  -- Mantém apenas letras e espaços, divide em palavras
  palavras := regexp_split_to_array(trim(regexp_replace(_nome, '[^A-Za-zÀ-ÿ ]', ' ', 'g')), '\s+');
  FOREACH p IN ARRAY palavras LOOP
    IF length(p) > 0 AND length(sigla) < 4 THEN
      sigla := sigla || upper(substr(p, 1, 1));
    END IF;
  END LOOP;
  IF length(sigla) < 2 THEN
    sigla := upper(substr(regexp_replace(_nome, '[^A-Za-z]', '', 'g'), 1, 2));
  END IF;
  IF length(sigla) = 0 THEN
    sigla := 'CH';
  END IF;
  RETURN sigla;
END;
$$;

-- from 20260509020948_af7b8b6c-d47a-42c3-93e5-a84cb905f92b.sql
CREATE OR REPLACE FUNCTION public.gerar_codigo_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nome_ws text;
  sigla text;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT nome INTO nome_ws FROM public.workspaces WHERE id = NEW.workspace_id;
    sigla := public.calcular_sigla_workspace(nome_ws);
    NEW.codigo := sigla || '-' || lpad(NEW.numero::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- trigger from 20260509020948_af7b8b6c-d47a-42c3-93e5-a84cb905f92b.sql
CREATE TRIGGER trg_chamado_zz_codigo
BEFORE INSERT ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.gerar_codigo_chamado();
ALTER TABLE public.chamado_requisicao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY req_itens_selecionar ON public.chamado_requisicao_itens
CREATE POLICY req_itens_inserir ON public.chamado_requisicao_itens
CREATE POLICY req_itens_atualizar ON public.chamado_requisicao_itens
CREATE POLICY req_itens_excluir ON public.chamado_requisicao_itens
DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;
CREATE POLICY chamados_selecionar ON public.chamados
DROP POLICY IF EXISTS comentarios_selecionar ON public.chamado_comentarios;
CREATE POLICY comentarios_selecionar ON public.chamado_comentarios
DROP POLICY IF EXISTS anexos_selecionar ON public.chamado_anexos;
CREATE POLICY anexos_selecionar ON public.chamado_anexos
DROP POLICY IF EXISTS historico_selecionar ON public.chamado_historico;
CREATE POLICY historico_selecionar ON public.chamado_historico
DROP POLICY IF EXISTS ia_execucoes_selecionar ON public.chamado_ia_execucoes;
CREATE POLICY ia_execucoes_selecionar ON public.chamado_ia_execucoes
DROP POLICY IF EXISTS req_itens_selecionar ON public.chamado_requisicao_itens;
CREATE POLICY req_itens_selecionar ON public.chamado_requisicao_itens
ALTER TABLE public.workspace_membro_departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wmd_selecionar"
CREATE POLICY "wmd_inserir"
CREATE POLICY "wmd_atualizar"
CREATE POLICY "wmd_excluir"

-- from 20260510003812_37b57fce-9c6a-481e-8949-ab56d029721b.sql
CREATE OR REPLACE FUNCTION public.seed_checklist_condominio(_workspace_id uuid, _criado_por uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _template_id uuid;
  _itens jsonb := '[
    {"s":"Dados do Condomínio","ss":"Cadastrais","r":"Razão social","t":"texto"},
    {"s":"Dados do Condomínio","ss":"Cadastrais","r":"Nome fantasia","t":"texto"},
    {"s":"Dados do Condomínio","ss":"Cadastrais","r":"CNPJ","t":"texto"},
    {"s":"Dados do Condomínio","ss":"Cadastrais","r":"Endereço completo","t":"textarea"},
    {"s":"Dados do Condomínio","ss":"Cadastrais","r":"CEP","t":"texto"},
    {"s":"Dados do Condomínio","ss":"Cadastrais","r":"Cidade / Estado","t":"texto"},
    {"s":"Dados do Condomínio","ss":"Acesso","r":"Horário de acesso para obras e instalação","t":"texto"},
    {"s":"Dados do Condomínio","ss":"Acesso","r":"Regras de acesso","t":"textarea"},
    {"s":"Dados do Condomínio","ss":"Acesso","r":"Necessidade de cadastro prévio","t":"sim_nao"},
    {"s":"Dados do Condomínio","ss":"Acesso","r":"Restrições para entrada de prestadores","t":"textarea"},

    {"s":"Síndico / Responsável principal","ss":null,"r":"Nome completo","t":"texto"},
    {"s":"Síndico / Responsável principal","ss":null,"r":"Cargo / departamento","t":"texto"},
    {"s":"Síndico / Responsável principal","ss":null,"r":"Telefone","t":"texto"},
    {"s":"Síndico / Responsável principal","ss":null,"r":"WhatsApp","t":"texto"},
    {"s":"Síndico / Responsável principal","ss":null,"r":"E-mail","t":"texto"},

    {"s":"Gerente / Administrativo","ss":null,"r":"Nome completo","t":"texto"},
    {"s":"Gerente / Administrativo","ss":null,"r":"Cargo / departamento","t":"texto"},
    {"s":"Gerente / Administrativo","ss":null,"r":"Telefone","t":"texto"},
    {"s":"Gerente / Administrativo","ss":null,"r":"WhatsApp","t":"texto"},
    {"s":"Gerente / Administrativo","ss":null,"r":"E-mail","t":"texto"},

    {"s":"Contato operacional","ss":null,"r":"Zelador","t":"texto"},
    {"s":"Contato operacional","ss":null,"r":"Manutenção","t":"texto"},
    {"s":"Contato operacional","ss":null,"r":"Facilities","t":"texto"},

    {"s":"Negociação","ss":"Financeiro","r":"Previsão de faturamento","t":"texto"},
    {"s":"Negociação","ss":"Financeiro","r":"Quantidade de unidades","t":"numero"},
    {"s":"Negociação","ss":"Financeiro","r":"Quantidade estimada de moradores","t":"numero"},
    {"s":"Negociação","ss":"Financeiro","r":"Ticket médio estimado","t":"texto"},
    {"s":"Negociação","ss":"Financeiro","r":"Potencial de consumo","t":"textarea"},
    {"s":"Negociação","ss":"Perfil","r":"Perfil do condomínio","t":"select","o":["AA","A","B","C"]},
    {"s":"Negociação","ss":"Público","r":"Possui crianças","t":"checkbox"},
    {"s":"Negociação","ss":"Público","r":"Possui adolescentes","t":"checkbox"},
    {"s":"Negociação","ss":"Público","r":"Muitos idosos","t":"checkbox"},
    {"s":"Negociação","ss":"Público","r":"Pet friendly","t":"checkbox"},
    {"s":"Negociação","ss":"Público","r":"Alto fluxo","t":"checkbox"},
    {"s":"Negociação","ss":"Público","r":"Condomínio clube","t":"checkbox"},

    {"s":"Estrutura e Lazer","ss":null,"r":"Varanda gourmet","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Churrasqueira externa","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Piscina","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Academia","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Salão de festas","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Coworking","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Quadra esportiva","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Playground","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Sauna","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Espaço pet","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Máquina de gelo","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Lavanderia compartilhada","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Vending machines existentes","t":"sim_nao"},
    {"s":"Estrutura e Lazer","ss":null,"r":"Outros","t":"textarea"},

    {"s":"Concorrência e Mercado","ss":"Mercado próximo","r":"Existe mercado próximo?","t":"sim_nao"},
    {"s":"Concorrência e Mercado","ss":"Mercado próximo","r":"Nome do mercado","t":"texto"},
    {"s":"Concorrência e Mercado","ss":"Mercado próximo","r":"Distância aproximada","t":"texto"},
    {"s":"Concorrência e Mercado","ss":"Mercado próximo","r":"Tipo","t":"select","o":["Mercado","Padaria","Conveniência","Atacadista"]},
    {"s":"Concorrência e Mercado","ss":"Restrições","r":"Produtos proibidos","t":"textarea"},
    {"s":"Concorrência e Mercado","ss":"Restrições","r":"Restrição de bebidas alcoólicas","t":"sim_nao"},
    {"s":"Concorrência e Mercado","ss":"Restrições","r":"Restrição de cigarros","t":"sim_nao"},
    {"s":"Concorrência e Mercado","ss":"Restrições","r":"Horários de operação","t":"texto"},
    {"s":"Concorrência e Mercado","ss":"Sugestões","r":"Produtos mais pedidos","t":"textarea"},
    {"s":"Concorrência e Mercado","ss":"Sugestões","r":"Perfil de consumo","t":"textarea"},
    {"s":"Concorrência e Mercado","ss":"Sugestões","r":"Marcas desejadas","t":"textarea"},

    {"s":"Localização do Mini Mercado","ss":null,"r":"Onde ficará instalado","t":"textarea"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Torre / bloco","t":"texto"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Metragem do espaço","t":"texto"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Área total","t":"texto"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Pé direito","t":"texto"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Fotos do espaço","t":"textarea"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Planta baixa","t":"textarea"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Necessidade de reforma","t":"sim_nao"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Acesso elétrico","t":"sim_nao"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Distância do quadro de energia","t":"texto"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Internet disponível","t":"sim_nao"},
    {"s":"Localização do Mini Mercado","ss":null,"r":"Sinal de telefonia","t":"sim_nao"},

    {"s":"Implantação / Instalação","ss":"Tamanho","r":"Tamanho / padrão da loja","t":"select","o":["Pequeno (P)","Médio (M)","Grande (G)"]},
    {"s":"Implantação / Instalação","ss":"Civil","r":"Drywall","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Civil","r":"Pintura","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Civil","r":"Piso laminado","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Civil","r":"Piso vinílico","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Civil","r":"Nivelamento","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Civil","r":"Rodapé","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Civil","r":"Porta de vidro","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Civil","r":"Fechamento","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Elétrica","r":"Iluminação","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Elétrica","r":"Tomadas","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Elétrica","r":"Disjuntor dedicado","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Elétrica","r":"Medidor de energia","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Elétrica","r":"Quadro elétrico","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Elétrica","r":"Infraestrutura elétrica pronta","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Climatização","r":"Ar-condicionado","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Climatização","r":"Ventilação","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Rede e Internet","r":"Rede cabeada","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Rede e Internet","r":"Cabo de rede","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Rede e Internet","r":"Modem","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Rede e Internet","r":"Link dedicado","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Rede e Internet","r":"Wi-Fi","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Comunicação visual","r":"Logo","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Comunicação visual","r":"Adesivo","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Comunicação visual","r":"Fachada","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Comunicação visual","r":"Totem","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Comunicação visual","r":"Identidade visual","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Segurança","r":"Câmeras","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Segurança","r":"Controle de acesso","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Segurança","r":"Fechadura eletrônica","t":"checkbox"},
    {"s":"Implantação / Instalação","ss":"Segurança","r":"Alarme","t":"checkbox"},

    {"s":"Aprovações Necessárias","ss":null,"r":"Aprovação do síndico","t":"checkbox"},
    {"s":"Aprovações Necessárias","ss":null,"r":"Aprovação do conselho","t":"checkbox"},
    {"s":"Aprovações Necessárias","ss":null,"r":"Aprovação jurídica","t":"checkbox"},
    {"s":"Aprovações Necessárias","ss":null,"r":"Aprovação financeira","t":"checkbox"},
    {"s":"Aprovações Necessárias","ss":null,"r":"Contrato assinado","t":"checkbox"},
    {"s":"Aprovações Necessárias","ss":null,"r":"SLA aprovado","t":"checkbox"},
    {"s":"Aprovações Necessárias","ss":null,"r":"Data da aprovação","t":"data"},
    {"s":"Aprovações Necessárias","ss":null,"r":"Responsável pela aprovação","t":"texto"},

    {"s":"Cronograma","ss":null,"r":"Data prevista da obra","t":"data"},
    {"s":"Cronograma","ss":null,"r":"Data prevista da instalação","t":"data"},
    {"s":"Cronograma","ss":null,"r":"Data prevista da inauguração","t":"data"},
    {"s":"Cronograma","ss":null,"r":"Responsável técnico","t":"texto"},
    {"s":"Cronograma","ss":null,"r":"Equipe alocada","t":"textarea"},

    {"s":"Observações Gerais","ss":null,"r":"Informações adicionais","t":"textarea"},
    {"s":"Observações Gerais","ss":null,"r":"Riscos","t":"textarea"},
    {"s":"Observações Gerais","ss":null,"r":"Pendências","t":"textarea"},
    {"s":"Observações Gerais","ss":null,"r":"Observações comerciais","t":"textarea"},
    {"s":"Observações Gerais","ss":null,"r":"Observações técnicas","t":"textarea"}
  ]'::jsonb;
  _item jsonb;
  _ord int := 0;
BEGIN
  INSERT INTO public.checklist_templates(workspace_id, nome, descricao, padrao, criado_por)
  VALUES (_workspace_id, 'Implantação de Condomínio', 'Modelo padrão para implantação de mini mercado em condomínio', true, _criado_por)
  RETURNING id INTO _template_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_itens) LOOP
    _ord := _ord + 1;
    INSERT INTO public.checklist_template_itens(template_id, workspace_id, secao, subsecao, rotulo, tipo, opcoes, ordem)
    VALUES (
      _template_id,
      _workspace_id,
      _item->>'s',
      _item->>'ss',
      _item->>'r',
      _item->>'t',
      _item->'o',
      _ord
    );
  END LOOP;

  RETURN _template_id;
END;
$$;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_select ON public.checklist_templates FOR SELECT
CREATE POLICY ct_insert ON public.checklist_templates FOR INSERT
CREATE POLICY ct_update ON public.checklist_templates FOR UPDATE
CREATE POLICY ct_delete ON public.checklist_templates FOR DELETE
CREATE POLICY cti_select ON public.checklist_template_itens FOR SELECT
CREATE POLICY cti_insert ON public.checklist_template_itens FOR INSERT
CREATE POLICY cti_update ON public.checklist_template_itens FOR UPDATE
CREATE POLICY cti_delete ON public.checklist_template_itens FOR DELETE
CREATE POLICY c_select ON public.checklists FOR SELECT
CREATE POLICY c_insert ON public.checklists FOR INSERT
CREATE POLICY c_update ON public.checklists FOR UPDATE
CREATE POLICY c_delete ON public.checklists FOR DELETE
CREATE POLICY cr_select ON public.checklist_respostas FOR SELECT
CREATE POLICY cr_insert ON public.checklist_respostas FOR INSERT
CREATE POLICY cr_update ON public.checklist_respostas FOR UPDATE
CREATE POLICY cr_delete ON public.checklist_respostas FOR DELETE
CREATE POLICY ch_select ON public.checklist_historico FOR SELECT
CREATE POLICY ch_insert ON public.checklist_historico FOR INSERT
ALTER TABLE public.checklist_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_select" ON public.checklist_comentarios
CREATE POLICY "cc_insert" ON public.checklist_comentarios
CREATE POLICY "cc_update" ON public.checklist_comentarios
CREATE POLICY "cc_delete" ON public.checklist_comentarios
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_select ON public.notificacoes
CREATE POLICY notif_insert ON public.notificacoes
CREATE POLICY notif_update ON public.notificacoes
CREATE POLICY notif_delete ON public.notificacoes

-- from 20260510014752_734e2c41-b704-4cbd-bf55-229190499108.sql
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

-- from 20260510014752_734e2c41-b704-4cbd-bf55-229190499108.sql
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

-- from 20260510014752_734e2c41-b704-4cbd-bf55-229190499108.sql
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
DROP POLICY IF EXISTS chamados_selecionar ON public.chamados;
CREATE POLICY chamados_selecionar ON public.chamados
DROP POLICY IF EXISTS chamados_atualizar ON public.chamados;
CREATE POLICY chamados_atualizar ON public.chamados
ALTER TABLE public.workspace_uazapi_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY uazapi_config_select ON public.workspace_uazapi_config
CREATE POLICY uazapi_config_insert ON public.workspace_uazapi_config
CREATE POLICY uazapi_config_update ON public.workspace_uazapi_config
CREATE POLICY uazapi_config_delete ON public.workspace_uazapi_config
ALTER TABLE public.workspace_uazapi_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY uazapi_logs_select ON public.workspace_uazapi_logs
CREATE POLICY uazapi_logs_insert ON public.workspace_uazapi_logs

-- from 20260510023511_62a8ca91-5041-42db-ba40-717964fa911f.sql
CREATE OR REPLACE FUNCTION public.disparar_whatsapp_chamado(
  _workspace_id uuid,
  _chamado_id uuid,
  _evento text,
  _ator_id uuid,
  _comentario_id uuid DEFAULT NULL,
  _detalhes jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _secret text;
  _url text;
BEGIN
  SELECT valor INTO _secret FROM public.app_config WHERE chave = 'whatsapp_notify_secret';
  SELECT valor INTO _url    FROM public.app_config WHERE chave = 'whatsapp_notify_url';
  IF _secret IS NULL OR _url IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _secret
    ),
    body := jsonb_build_object(
      'workspace_id', _workspace_id,
      'chamado_id',   _chamado_id,
      'evento',       _evento,
      'ator_id',      _ator_id,
      'comentario_id',_comentario_id,
      'detalhes',     _detalhes
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- nunca bloquear a transação original
  NULL;
END;
$$;

-- from 20260510023511_62a8ca91-5041-42db-ba40-717964fa911f.sql
CREATE OR REPLACE FUNCTION public.tg_chamado_whatsapp_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.disparar_whatsapp_chamado(
    NEW.workspace_id, NEW.id, 'criado', NEW.criado_por
  );
  RETURN NEW;
END;
$$;

-- from 20260510023511_62a8ca91-5041-42db-ba40-717964fa911f.sql
CREATE OR REPLACE FUNCTION public.tg_chamado_whatsapp_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ator uuid := auth.uid();
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.disparar_whatsapp_chamado(
      NEW.workspace_id, NEW.id,
      CASE NEW.status::text
        WHEN 'Resolvido' THEN 'resolvido'
        WHEN 'Pausado'   THEN 'pausado'
        WHEN 'Agendado'  THEN 'agendado'
        WHEN 'Fechado'   THEN 'fechado'
        WHEN 'Cancelado' THEN 'cancelado'
        ELSE 'status'
      END,
      _ator, NULL,
      jsonb_build_object('de', OLD.status, 'para', NEW.status)
    );
  END IF;
  IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
    PERFORM public.disparar_whatsapp_chamado(
      NEW.workspace_id, NEW.id, 'responsavel', _ator, NULL,
      jsonb_build_object('de', OLD.responsavel_id, 'para', NEW.responsavel_id)
    );
  END IF;
  IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
    PERFORM public.disparar_whatsapp_chamado(
      NEW.workspace_id, NEW.id, 'prioridade', _ator, NULL,
      jsonb_build_object('de', OLD.prioridade, 'para', NEW.prioridade)
    );
  END IF;
  IF NEW.departamento_id IS DISTINCT FROM OLD.departamento_id THEN
    PERFORM public.disparar_whatsapp_chamado(
      NEW.workspace_id, NEW.id, 'departamento', _ator, NULL,
      jsonb_build_object('de', OLD.departamento_id, 'para', NEW.departamento_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- from 20260510023511_62a8ca91-5041-42db-ba40-717964fa911f.sql
CREATE OR REPLACE FUNCTION public.tg_comentario_whatsapp_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.interno THEN
    RETURN NEW;
  END IF;
  PERFORM public.disparar_whatsapp_chamado(
    NEW.workspace_id, NEW.chamado_id, 'comentario', NEW.autor_id, NEW.id
  );
  RETURN NEW;
END;
$$;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_whatsapp_notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_notif_select ON public.chamado_whatsapp_notificacoes