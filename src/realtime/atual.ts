// API pública de realtime para todo o frontend.
// Uso:
//   const inscricao = inscrever(Canais.notificacoes(wsId), () => qc.invalidateQueries(...));
//   return () => inscricao.unsubscribe();
//
// Cutover: substituir conteúdo de `atual.adapter.ts` pelo `atual.adapter.proprio.ts`.

import { useEffect } from "react";
import type { Inscricao } from "./tipos";
import { realtime as adapter } from "./atual.adapter";

export function inscrever(canal: string, cb: () => void): Inscricao {
  return adapter.inscrever(canal, cb);
}

/** Hook utilitário: inscreve no canal e cancela ao desmontar. */
export function useInscricaoRealtime(
  canal: string | null | undefined,
  cb: () => void,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    if (!canal) return;
    const i = inscrever(canal, cb);
    return () => i.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal, ...deps]);
}

/** Nomes canônicos de canais — devem casar com o backend (publish.server.ts). */
export const Canais = {
  notificacoes: (workspaceId: string) => `notif:${workspaceId}`,
  iaExecucoes: (chamadoId: string) => `ia-exec:${chamadoId}`,
  chamado: (chamadoId: string) => `chamado:${chamadoId}`,
  comentarios: (chamadoId: string) => `chamado-coment:${chamadoId}`,
} as const;
