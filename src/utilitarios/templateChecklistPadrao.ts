import type { TipoItemChecklist } from "@/hooks/useChecklists";

export interface ItemPadrao {
  secao: string;
  subsecao?: string | null;
  rotulo: string;
  tipo: TipoItemChecklist;
  opcoes?: string[];
}

export const ITENS_TEMPLATE_PADRAO: ItemPadrao[] = [
  // Dados do Condomínio
  { secao: "Dados do Condomínio", subsecao: "Cadastrais", rotulo: "Razão social", tipo: "texto" },
  { secao: "Dados do Condomínio", subsecao: "Cadastrais", rotulo: "Nome fantasia", tipo: "texto" },
  { secao: "Dados do Condomínio", subsecao: "Cadastrais", rotulo: "CNPJ", tipo: "texto" },
  { secao: "Dados do Condomínio", subsecao: "Cadastrais", rotulo: "Endereço completo", tipo: "textarea" },
  { secao: "Dados do Condomínio", subsecao: "Cadastrais", rotulo: "CEP", tipo: "texto" },
  { secao: "Dados do Condomínio", subsecao: "Cadastrais", rotulo: "Cidade / Estado", tipo: "texto" },
  { secao: "Dados do Condomínio", subsecao: "Acesso", rotulo: "Horário de acesso para obras e instalação", tipo: "texto" },
  { secao: "Dados do Condomínio", subsecao: "Acesso", rotulo: "Regras de acesso", tipo: "textarea" },
  { secao: "Dados do Condomínio", subsecao: "Acesso", rotulo: "Necessidade de cadastro prévio", tipo: "sim_nao" },
  { secao: "Dados do Condomínio", subsecao: "Acesso", rotulo: "Restrições para entrada de prestadores", tipo: "textarea" },
  // Síndico
  { secao: "Síndico / Responsável principal", rotulo: "Nome completo", tipo: "texto" },
  { secao: "Síndico / Responsável principal", rotulo: "Cargo / departamento", tipo: "texto" },
  { secao: "Síndico / Responsável principal", rotulo: "Telefone", tipo: "texto" },
  { secao: "Síndico / Responsável principal", rotulo: "WhatsApp", tipo: "texto" },
  { secao: "Síndico / Responsável principal", rotulo: "E-mail", tipo: "texto" },
  // Gerente
  { secao: "Gerente / Administrativo", rotulo: "Nome completo", tipo: "texto" },
  { secao: "Gerente / Administrativo", rotulo: "Cargo / departamento", tipo: "texto" },
  { secao: "Gerente / Administrativo", rotulo: "Telefone", tipo: "texto" },
  { secao: "Gerente / Administrativo", rotulo: "WhatsApp", tipo: "texto" },
  { secao: "Gerente / Administrativo", rotulo: "E-mail", tipo: "texto" },
  // Operacional
  { secao: "Contato operacional", rotulo: "Zelador", tipo: "texto" },
  { secao: "Contato operacional", rotulo: "Manutenção", tipo: "texto" },
  { secao: "Contato operacional", rotulo: "Facilities", tipo: "texto" },
  // Negociação
  { secao: "Negociação", subsecao: "Financeiro", rotulo: "Previsão de faturamento", tipo: "texto" },
  { secao: "Negociação", subsecao: "Financeiro", rotulo: "Quantidade de unidades", tipo: "numero" },
  { secao: "Negociação", subsecao: "Financeiro", rotulo: "Quantidade estimada de moradores", tipo: "numero" },
  { secao: "Negociação", subsecao: "Financeiro", rotulo: "Ticket médio estimado", tipo: "texto" },
  { secao: "Negociação", subsecao: "Financeiro", rotulo: "Potencial de consumo", tipo: "textarea" },
  { secao: "Negociação", subsecao: "Perfil", rotulo: "Perfil do condomínio", tipo: "select", opcoes: ["AA", "A", "B", "C"] },
  { secao: "Negociação", subsecao: "Público", rotulo: "Possui crianças", tipo: "checkbox" },
  { secao: "Negociação", subsecao: "Público", rotulo: "Possui adolescentes", tipo: "checkbox" },
  { secao: "Negociação", subsecao: "Público", rotulo: "Muitos idosos", tipo: "checkbox" },
  { secao: "Negociação", subsecao: "Público", rotulo: "Pet friendly", tipo: "checkbox" },
  { secao: "Negociação", subsecao: "Público", rotulo: "Alto fluxo", tipo: "checkbox" },
  { secao: "Negociação", subsecao: "Público", rotulo: "Condomínio clube", tipo: "checkbox" },
  // Estrutura e Lazer
  ...[
    "Varanda gourmet", "Churrasqueira externa", "Piscina", "Academia", "Salão de festas",
    "Coworking", "Quadra esportiva", "Playground", "Sauna", "Espaço pet",
    "Máquina de gelo", "Lavanderia compartilhada", "Vending machines existentes",
  ].map((rotulo) => ({ secao: "Estrutura e Lazer", rotulo, tipo: "sim_nao" as TipoItemChecklist })),
  { secao: "Estrutura e Lazer", rotulo: "Outros", tipo: "textarea" },
  // Concorrência
  { secao: "Concorrência e Mercado", subsecao: "Mercado próximo", rotulo: "Existe mercado próximo?", tipo: "sim_nao" },
  { secao: "Concorrência e Mercado", subsecao: "Mercado próximo", rotulo: "Nome do mercado", tipo: "texto" },
  { secao: "Concorrência e Mercado", subsecao: "Mercado próximo", rotulo: "Distância aproximada", tipo: "texto" },
  { secao: "Concorrência e Mercado", subsecao: "Mercado próximo", rotulo: "Tipo", tipo: "select", opcoes: ["Mercado", "Padaria", "Conveniência", "Atacadista"] },
  { secao: "Concorrência e Mercado", subsecao: "Restrições", rotulo: "Produtos proibidos", tipo: "textarea" },
  { secao: "Concorrência e Mercado", subsecao: "Restrições", rotulo: "Restrição de bebidas alcoólicas", tipo: "sim_nao" },
  { secao: "Concorrência e Mercado", subsecao: "Restrições", rotulo: "Restrição de cigarros", tipo: "sim_nao" },
  { secao: "Concorrência e Mercado", subsecao: "Restrições", rotulo: "Horários de operação", tipo: "texto" },
  { secao: "Concorrência e Mercado", subsecao: "Sugestões", rotulo: "Produtos mais pedidos", tipo: "textarea" },
  { secao: "Concorrência e Mercado", subsecao: "Sugestões", rotulo: "Perfil de consumo", tipo: "textarea" },
  { secao: "Concorrência e Mercado", subsecao: "Sugestões", rotulo: "Marcas desejadas", tipo: "textarea" },
  // Localização
  { secao: "Localização do Mini Mercado", rotulo: "Onde ficará instalado", tipo: "textarea" },
  { secao: "Localização do Mini Mercado", rotulo: "Torre / bloco", tipo: "texto" },
  { secao: "Localização do Mini Mercado", rotulo: "Metragem do espaço", tipo: "texto" },
  { secao: "Localização do Mini Mercado", rotulo: "Área total", tipo: "texto" },
  { secao: "Localização do Mini Mercado", rotulo: "Pé direito", tipo: "texto" },
  { secao: "Localização do Mini Mercado", rotulo: "Fotos do espaço", tipo: "textarea" },
  { secao: "Localização do Mini Mercado", rotulo: "Planta baixa", tipo: "textarea" },
  { secao: "Localização do Mini Mercado", rotulo: "Necessidade de reforma", tipo: "sim_nao" },
  { secao: "Localização do Mini Mercado", rotulo: "Acesso elétrico", tipo: "sim_nao" },
  { secao: "Localização do Mini Mercado", rotulo: "Distância do quadro de energia", tipo: "texto" },
  { secao: "Localização do Mini Mercado", rotulo: "Internet disponível", tipo: "sim_nao" },
  { secao: "Localização do Mini Mercado", rotulo: "Sinal de telefonia", tipo: "sim_nao" },
  // Implantação
  { secao: "Implantação / Instalação", subsecao: "Tamanho", rotulo: "Tamanho / padrão da loja", tipo: "select", opcoes: ["Pequeno (P)", "Médio (M)", "Grande (G)"] },
  ...["Drywall", "Pintura", "Piso laminado", "Piso vinílico", "Nivelamento", "Rodapé", "Porta de vidro", "Fechamento"]
    .map((rotulo) => ({ secao: "Implantação / Instalação", subsecao: "Civil", rotulo, tipo: "checkbox" as TipoItemChecklist })),
  ...["Iluminação", "Tomadas", "Disjuntor dedicado", "Medidor de energia", "Quadro elétrico", "Infraestrutura elétrica pronta"]
    .map((rotulo) => ({ secao: "Implantação / Instalação", subsecao: "Elétrica", rotulo, tipo: "checkbox" as TipoItemChecklist })),
  ...["Ar-condicionado", "Ventilação"]
    .map((rotulo) => ({ secao: "Implantação / Instalação", subsecao: "Climatização", rotulo, tipo: "checkbox" as TipoItemChecklist })),
  ...["Rede cabeada", "Cabo de rede", "Modem", "Link dedicado", "Wi-Fi"]
    .map((rotulo) => ({ secao: "Implantação / Instalação", subsecao: "Rede e Internet", rotulo, tipo: "checkbox" as TipoItemChecklist })),
  ...["Logo", "Adesivo", "Fachada", "Totem", "Identidade visual"]
    .map((rotulo) => ({ secao: "Implantação / Instalação", subsecao: "Comunicação visual", rotulo, tipo: "checkbox" as TipoItemChecklist })),
  ...["Câmeras", "Controle de acesso", "Fechadura eletrônica", "Alarme"]
    .map((rotulo) => ({ secao: "Implantação / Instalação", subsecao: "Segurança", rotulo, tipo: "checkbox" as TipoItemChecklist })),
  // Aprovações
  ...["Aprovação do síndico", "Aprovação do conselho", "Aprovação jurídica", "Aprovação financeira", "Contrato assinado", "SLA aprovado"]
    .map((rotulo) => ({ secao: "Aprovações Necessárias", rotulo, tipo: "checkbox" as TipoItemChecklist })),
  { secao: "Aprovações Necessárias", rotulo: "Data da aprovação", tipo: "data" },
  { secao: "Aprovações Necessárias", rotulo: "Responsável pela aprovação", tipo: "texto" },
  // Cronograma
  { secao: "Cronograma", rotulo: "Data prevista da obra", tipo: "data" },
  { secao: "Cronograma", rotulo: "Data prevista da instalação", tipo: "data" },
  { secao: "Cronograma", rotulo: "Data prevista da inauguração", tipo: "data" },
  { secao: "Cronograma", rotulo: "Responsável técnico", tipo: "texto" },
  { secao: "Cronograma", rotulo: "Equipe alocada", tipo: "textarea" },
  // Observações
  { secao: "Observações Gerais", rotulo: "Informações adicionais", tipo: "textarea" },
  { secao: "Observações Gerais", rotulo: "Riscos", tipo: "textarea" },
  { secao: "Observações Gerais", rotulo: "Pendências", tipo: "textarea" },
  { secao: "Observações Gerais", rotulo: "Observações comerciais", tipo: "textarea" },
  { secao: "Observações Gerais", rotulo: "Observações técnicas", tipo: "textarea" },
];
