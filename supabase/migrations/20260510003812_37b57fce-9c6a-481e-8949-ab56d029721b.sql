
-- ============ TABELAS ============

CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  padrao boolean NOT NULL DEFAULT false,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_templates_ws ON public.checklist_templates(workspace_id);

CREATE TABLE public.checklist_template_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  secao text NOT NULL,
  subsecao text,
  rotulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'checkbox',
  opcoes jsonb,
  ordem integer NOT NULL DEFAULT 0,
  obrigatorio boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cti_template ON public.checklist_template_itens(template_id, ordem);
CREATE INDEX idx_cti_ws ON public.checklist_template_itens(workspace_id);

CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'Em andamento',
  responsavel_id uuid,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklists_ws ON public.checklists(workspace_id);

CREATE TABLE public.checklist_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.checklist_template_itens(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  valor jsonb,
  atualizado_por uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(checklist_id, item_id)
);
CREATE INDEX idx_cr_checklist ON public.checklist_respostas(checklist_id);

CREATE TABLE public.checklist_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  usuario_id uuid,
  acao text NOT NULL,
  item_id uuid,
  rotulo text,
  valor_anterior jsonb,
  valor_novo jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ch_checklist ON public.checklist_historico(checklist_id, criado_em DESC);

-- ============ TRIGGERS ============

CREATE TRIGGER trg_ct_atualizado BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();
CREATE TRIGGER trg_cti_atualizado BEFORE UPDATE ON public.checklist_template_itens
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();
CREATE TRIGGER trg_c_atualizado BEFORE UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

-- ============ RLS ============

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_historico ENABLE ROW LEVEL SECURITY;

-- templates
CREATE POLICY ct_select ON public.checklist_templates FOR SELECT
  USING (workspace_id IN (SELECT workspaces_do_usuario()));
CREATE POLICY ct_insert ON public.checklist_templates FOR INSERT
  WITH CHECK (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]) AND criado_por = auth.uid());
CREATE POLICY ct_update ON public.checklist_templates FOR UPDATE
  USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));
CREATE POLICY ct_delete ON public.checklist_templates FOR DELETE
  USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));

-- itens template
CREATE POLICY cti_select ON public.checklist_template_itens FOR SELECT
  USING (workspace_id IN (SELECT workspaces_do_usuario()));
CREATE POLICY cti_insert ON public.checklist_template_itens FOR INSERT
  WITH CHECK (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));
CREATE POLICY cti_update ON public.checklist_template_itens FOR UPDATE
  USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));
CREATE POLICY cti_delete ON public.checklist_template_itens FOR DELETE
  USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));

-- checklists (instâncias)
CREATE POLICY c_select ON public.checklists FOR SELECT
  USING (workspace_id IN (SELECT workspaces_do_usuario()));
CREATE POLICY c_insert ON public.checklists FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspaces_do_usuario()) AND criado_por = auth.uid());
CREATE POLICY c_update ON public.checklists FOR UPDATE
  USING (workspace_id IN (SELECT workspaces_do_usuario()));
CREATE POLICY c_delete ON public.checklists FOR DELETE
  USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));

-- respostas
CREATE POLICY cr_select ON public.checklist_respostas FOR SELECT
  USING (workspace_id IN (SELECT workspaces_do_usuario()));
CREATE POLICY cr_insert ON public.checklist_respostas FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspaces_do_usuario()));
CREATE POLICY cr_update ON public.checklist_respostas FOR UPDATE
  USING (workspace_id IN (SELECT workspaces_do_usuario()));
CREATE POLICY cr_delete ON public.checklist_respostas FOR DELETE
  USING (tem_papel_workspace(workspace_id, ARRAY['Proprietario'::papel_membro,'Administrador'::papel_membro]));

-- histórico
CREATE POLICY ch_select ON public.checklist_historico FOR SELECT
  USING (workspace_id IN (SELECT workspaces_do_usuario()));
CREATE POLICY ch_insert ON public.checklist_historico FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspaces_do_usuario()));

-- ============ FUNÇÃO DE SEED DO TEMPLATE PADRÃO ============

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
