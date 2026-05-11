// Bus de eventos in-memory para realtime na VPS.
//
// Substitui o `postgres_changes` do Supabase Realtime: ao invés de a app
// ouvir o Postgres, os repositórios publicam eventos aqui e o handler SSE
// (src/routes/api/realtime/$canal.ts) repassa para os clientes inscritos.
//
// LIMITE: roda em memória de UM processo. Para múltiplas instâncias da app
// na VPS, troque por Redis pub/sub (mantenha a mesma assinatura de API).

import { EventEmitter } from "node:events";

export interface EventoRealtime {
  canal: string;
  // tipo lógico do evento (ex.: "INSERT", "UPDATE", "DELETE", "REFETCH")
  evento: string;
  // payload livre — costuma carregar { id, workspaceId, ...campos relevantes }
  dados?: Record<string, unknown>;
  ts: number;
}

class BusRealtime {
  private emitter = new EventEmitter();
  constructor() {
    // Um servidor pode ter centenas de listeners (1 por aba aberta).
    this.emitter.setMaxListeners(0);
  }

  publicar(canal: string, evento: string, dados?: Record<string, unknown>) {
    const msg: EventoRealtime = { canal, evento, dados, ts: Date.now() };
    this.emitter.emit(canal, msg);
  }

  inscrever(canal: string, handler: (e: EventoRealtime) => void): () => void {
    this.emitter.on(canal, handler);
    return () => this.emitter.off(canal, handler);
  }
}

// Singleton — sobrevive ao HMR em dev.
const g = globalThis as unknown as { __busRealtime?: BusRealtime };
export const busRealtime: BusRealtime = g.__busRealtime ?? new BusRealtime();
g.__busRealtime = busRealtime;
