// Helpers de publicação para os repositórios.
// Mantemos os nomes de canal num único lugar para evitar typos no client.

import { busRealtime } from "./bus.server";

export const Canais = {
  notificacoes: (workspaceId: string) => `notif:${workspaceId}`,
  iaExecucoes: (chamadoId: string) => `ia-exec:${chamadoId}`,
  chamado: (chamadoId: string) => `chamado:${chamadoId}`,
  comentarios: (chamadoId: string) => `chamado-coment:${chamadoId}`,
} as const;

export function publicarNotificacao(
  workspaceId: string,
  evento: "INSERT" | "UPDATE" | "DELETE",
  dados?: Record<string, unknown>,
) {
  busRealtime.publicar(Canais.notificacoes(workspaceId), evento, dados);
}

export function publicarIaExecucao(
  chamadoId: string,
  evento: "INSERT",
  dados?: Record<string, unknown>,
) {
  busRealtime.publicar(Canais.iaExecucoes(chamadoId), evento, dados);
}

export function publicarChamado(
  chamadoId: string,
  evento: string,
  dados?: Record<string, unknown>,
) {
  busRealtime.publicar(Canais.chamado(chamadoId), evento, dados);
}
