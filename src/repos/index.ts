// Re-exports para facilitar imports nas server functions.
export * as chamadosRepo from "./chamados.repo";
export * as categoriasRepo from "./categorias.repo";
export * as departamentosRepo from "./departamentos.repo";
export * as notificacoesRepo from "./notificacoes.repo";
export * as perfisRepo from "./perfis.repo";
export * as projetosRepo from "./projetos.repo";
export * as checklistsRepo from "./checklists.repo";
export * as workspacesRepo from "./workspaces.repo";

export type { Ctx, CtxWs } from "./types";
export { Proibido, NaoEncontrado } from "./types";
