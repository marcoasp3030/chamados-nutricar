import type { PrioridadeChamado } from "./chamado";

export type StatusProjeto = "Planejado" | "Em andamento" | "Pausado" | "Concluido" | "Arquivado";

export type StatusTarefa = "A fazer" | "Em andamento" | "Em revisao" | "Concluido";

export interface Projeto {
  id: string;
  workspace_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  status: StatusProjeto;
  inicio_em: string | null;
  fim_previsto: string | null;
  responsavel_id: string | null;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ProjetoComResumo extends Projeto {
  responsavel?: { id: string; nome: string } | null;
  total_tarefas?: number;
  tarefas_concluidas?: number;
}

export interface Tarefa {
  id: string;
  projeto_id: string;
  workspace_id: string;
  titulo: string;
  descricao: string | null;
  status: StatusTarefa;
  prioridade: PrioridadeChamado;
  responsavel_id: string | null;
  prazo: string | null;
  ordem: number;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
}

export interface TarefaComPessoa extends Tarefa {
  responsavel?: { id: string; nome: string } | null;
}

export const STATUS_PROJETO: StatusProjeto[] = [
  "Planejado",
  "Em andamento",
  "Pausado",
  "Concluido",
  "Arquivado",
];

export const STATUS_TAREFA: StatusTarefa[] = [
  "A fazer",
  "Em andamento",
  "Em revisao",
  "Concluido",
];
