// API pública de queries de dados para todo o frontend.
// Hoje delega para o adapter Supabase. No cutover (VPS), copie
// `atual.adapter.proprio.ts` por cima de `atual.adapter.ts`.

export { db } from "./atual.adapter";
export type { ClienteDados } from "./tipos";
