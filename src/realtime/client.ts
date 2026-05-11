// Cliente realtime para o browser. API parecida com o `supabase.channel(...)`
// para facilitar a troca: `realtime.canal(nome).on("INSERT", handler).subscribe()`.

export interface EventoRealtime {
  canal: string;
  evento: string;
  dados?: Record<string, unknown>;
  ts: number;
}

type Handler = (evt: EventoRealtime) => void;

class CanalRealtime {
  private es: EventSource | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private fechado = false;

  constructor(private nome: string) {}

  on(evento: "*" | string, handler: Handler): this {
    let set = this.handlers.get(evento);
    if (!set) {
      set = new Set();
      this.handlers.set(evento, set);
    }
    set.add(handler);
    return this;
  }

  subscribe(): this {
    if (this.es || this.fechado) return this;
    const url = `/api/realtime/${encodeURIComponent(this.nome)}`;
    this.es = new EventSource(url, { withCredentials: true });

    const dispatch = (evt: EventoRealtime) => {
      this.handlers.get(evt.evento)?.forEach((h) => h(evt));
      this.handlers.get("*")?.forEach((h) => h(evt));
    };

    // Mensagens vêm com `event: <evento>`. Como não sabemos os nomes a priori,
    // anexamos um listener genérico via onmessage e também via addEventListener
    // para os tipos conhecidos.
    this.es.onmessage = (m) => {
      try {
        dispatch(JSON.parse(m.data) as EventoRealtime);
      } catch {
        /* ignora */
      }
    };
    for (const tipo of ["INSERT", "UPDATE", "DELETE"]) {
      this.es.addEventListener(tipo, (m: MessageEvent) => {
        try {
          dispatch(JSON.parse(m.data) as EventoRealtime);
        } catch {
          /* ignora */
        }
      });
    }
    this.es.onerror = () => {
      // EventSource já reconecta automaticamente em backoff.
    };
    return this;
  }

  unsubscribe(): void {
    this.fechado = true;
    this.es?.close();
    this.es = null;
    this.handlers.clear();
  }
}

export const realtime = {
  canal(nome: string): CanalRealtime {
    return new CanalRealtime(nome);
  },
};

// Helpers para mapear igual ao server (publish.server.ts)
export const Canais = {
  notificacoes: (workspaceId: string) => `notif:${workspaceId}`,
  iaExecucoes: (chamadoId: string) => `ia-exec:${chamadoId}`,
  chamado: (chamadoId: string) => `chamado:${chamadoId}`,
  comentarios: (chamadoId: string) => `chamado-coment:${chamadoId}`,
} as const;
