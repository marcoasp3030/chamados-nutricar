import type { PapelMembro, PlanoWorkspace, StatusWorkspace } from "@/tipos/workspace";

// Mapeia valores armazenados (sem acento) para exibição (com acento)
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
