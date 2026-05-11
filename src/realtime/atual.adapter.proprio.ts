// Adapter próprio (VPS) — usa o EventSource de src/realtime/client.ts.
// Para ativar:
//   cp src/realtime/atual.adapter.proprio.ts src/realtime/atual.adapter.ts

import { realtime as realtimeVps } from "./client";
import type { ClienteRealtime, Inscricao } from "./tipos";

export const realtime: ClienteRealtime = {
  inscrever(canal: string, cb: () => void): Inscricao {
    const c = realtimeVps
      .canal(canal)
      .on("*", () => cb())
      .subscribe();
    return {
      unsubscribe() {
        c.unsubscribe();
      },
    };
  },
};
