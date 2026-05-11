// Adapter Supabase de realtime — usado HOJE no preview Lovable.
// Mapeia os canais lógicos de Canais (atual.ts) para subscriptions
// `postgres_changes` do Supabase.
//
// Cutover: substituir o conteúdo deste arquivo pelo `atual.adapter.proprio.ts`.

import { supabase } from "@/integrations/supabase/client";
import type { ClienteRealtime, Inscricao } from "./tipos";

type Mapping = {
  table: string;
  schema?: string;
  filterCol?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
};

// Resolve o nome lógico do canal para o que o Supabase precisa ouvir.
function resolver(nome: string): { mapeamento: Mapping; valor: string } | null {
  const [tipo, valor] = nome.split(":");
  if (!valor) return null;
  switch (tipo) {
    case "notif":
      return {
        mapeamento: { table: "notificacoes", filterCol: "workspace_id", event: "*" },
        valor,
      };
    case "ia-exec":
      return {
        mapeamento: {
          table: "chamado_ia_execucoes",
          filterCol: "chamado_id",
          event: "INSERT",
        },
        valor,
      };
    case "chamado":
      return {
        mapeamento: { table: "chamados", filterCol: "id", event: "*" },
        valor,
      };
    case "chamado-coment":
      return {
        mapeamento: {
          table: "chamado_comentarios",
          filterCol: "chamado_id",
          event: "*",
        },
        valor,
      };
    default:
      return null;
  }
}

export const realtime: ClienteRealtime = {
  inscrever(canal: string, cb: () => void): Inscricao {
    const r = resolver(canal);
    if (!r) {
      // Canal desconhecido — não inscreve, mas não quebra.
      return { unsubscribe() {} };
    }
    const { mapeamento, valor } = r;
    const ch = supabase
      .channel(canal)
      .on(
        "postgres_changes" as never,
        {
          event: mapeamento.event ?? "*",
          schema: mapeamento.schema ?? "public",
          table: mapeamento.table,
          filter: `${mapeamento.filterCol}=eq.${valor}`,
        } as never,
        () => cb(),
      )
      .subscribe();
    return {
      unsubscribe() {
        supabase.removeChannel(ch);
      },
    };
  },
};
