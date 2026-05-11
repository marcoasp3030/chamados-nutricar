// Tipos compartilhados pelos adapters de realtime.

export type Inscricao = { unsubscribe(): void };

export interface ClienteRealtime {
  /**
   * Inscreve em mudanças de um canal lógico. O callback é chamado
   * quando ocorre INSERT/UPDATE/DELETE relacionado ao canal.
   * Retorna um objeto com `unsubscribe()`.
   */
  inscrever(canal: string, cb: () => void): Inscricao;
}
