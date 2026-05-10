export type StatusChamado =
  | "Aberto"
  | "Em andamento"
  | "Agendado"
  | "Pausado"
  | "Aguardando solicitante"
  | "Aguardando terceiros"
  | "Resolvido"
  | "Fechado"
  | "Cancelado";

export type PrioridadeChamado = "Baixa" | "Media" | "Alta" | "Urgente";

export type TipoChamado = "Incidente" | "Solicitacao" | "Duvida" | "Melhoria" | "Bug";

export interface Chamado {
  id: string;
  workspace_id: string;
  numero: number;
  codigo: string | null;
  titulo: string;
  descricao: string | null;
  status: StatusChamado;
  prioridade: PrioridadeChamado;
  tipo: TipoChamado;
  categoria: string | null;
  loja: string | null;
  departamento_id: string | null;
  departamento_origem_id: string | null;
  motivo_agendamento: string | null;
  agendado_para: string | null;
  motivo_pausa: string | null;
  tratativa: string | null;
  tags: string[];
  solicitante_id: string;
  responsavel_id: string | null;
  chamado_pai_id: string | null;
  prazo: string | null;
  primeiro_resposta_em: string | null;
  resolvido_em: string | null;
  fechado_em: string | null;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ChamadoComPessoas extends Chamado {
  solicitante?: { id: string; nome: string; email: string } | null;
  responsavel?: { id: string; nome: string; email: string } | null;
}

export interface ComentarioChamado {
  id: string;
  chamado_id: string;
  workspace_id: string;
  autor_id: string;
  conteudo: string;
  interno: boolean;
  criado_em: string;
  atualizado_em: string;
  autor?: { id: string; nome: string; email: string } | null;
}

export interface HistoricoChamado {
  id: string;
  chamado_id: string;
  workspace_id: string;
  usuario_id: string | null;
  acao: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  criado_em: string;
  usuario?: { id: string; nome: string } | null;
}

export const STATUS_CHAMADO: StatusChamado[] = [
  "Aberto",
  "Em andamento",
  "Agendado",
  "Pausado",
  "Aguardando solicitante",
  "Aguardando terceiros",
  "Resolvido",
  "Fechado",
  "Cancelado",
];

export const PRIORIDADES_CHAMADO: PrioridadeChamado[] = ["Baixa", "Media", "Alta", "Urgente"];

export const TIPOS_CHAMADO: TipoChamado[] = [
  "Incidente",
  "Solicitacao",
  "Duvida",
  "Melhoria",
  "Bug",
];

export const STATUS_KANBAN: StatusChamado[] = [
  "Aberto",
  "Em andamento",
  "Agendado",
  "Pausado",
  "Aguardando solicitante",
  "Aguardando terceiros",
  "Resolvido",
];
