export type PapelMembro =
  | "Proprietario"
  | "Administrador"
  | "Gestor"
  | "Atendente"
  | "Solicitante";

export type PlanoWorkspace = "Gratuito" | "Inicial" | "Profissional" | "Empresarial";
export type StatusWorkspace = "Ativo" | "Suspenso" | "Cancelado";

export interface Workspace {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_primaria: string;
  cnpj: string | null;
  plano: PlanoWorkspace;
  status: StatusWorkspace;
  limite_usuarios: number;
  limite_chamados_mes: number;
  fuso_horario: string;
  proprietario_id: string;
  criado_em: string;
}

export interface WorkspaceComPapel extends Workspace {
  papel: PapelMembro;
}
