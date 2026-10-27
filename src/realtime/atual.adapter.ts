// Adapter realtime SSE próprio — substitui Supabase Realtime.

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
