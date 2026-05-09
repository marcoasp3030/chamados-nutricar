import type { PapelMembro, PlanoWorkspace, StatusWorkspace } from "@/tipos/workspace";
import type { PrioridadeChamado, StatusChamado, TipoChamado } from "@/tipos/chamado";

export const rotuloPapel: Record<PapelMembro, string> = {
  Proprietario: "Proprietário",
  Administrador: "Administrador",
  Gestor: "Gestor",
  Atendente: "Atendente",
  Solicitante: "Solicitante",
};

export const rotuloPlano: Record<PlanoWorkspace, string> = {
  Gratuito: "Gratuito",
  Inicial: "Inicial",
  Profissional: "Profissional",
  Empresarial: "Empresarial",
};

export const rotuloStatus: Record<StatusWorkspace, string> = {
  Ativo: "Ativo",
  Suspenso: "Suspenso",
  Cancelado: "Cancelado",
};

export const rotuloStatusChamado: Record<StatusChamado, string> = {
  Aberto: "Aberto",
  "Em andamento": "Em andamento",
  "Aguardando solicitante": "Aguardando solicitante",
  "Aguardando terceiros": "Aguardando terceiros",
  Resolvido: "Resolvido",
  Fechado: "Fechado",
  Cancelado: "Cancelado",
};

export const rotuloPrioridade: Record<PrioridadeChamado, string> = {
  Baixa: "Baixa",
  Media: "Média",
  Alta: "Alta",
  Urgente: "Urgente",
};

export const rotuloTipoChamado: Record<TipoChamado, string> = {
  Incidente: "Incidente",
  Solicitacao: "Solicitação",
  Duvida: "Dúvida",
  Melhoria: "Melhoria",
  Bug: "Bug",
};
