// API pública de storage para todo o frontend.
// Hoje delega para o adapter Supabase. No cutover (VPS), copie
// `atual.adapter.proprio.ts` por cima de `atual.adapter.ts`.

export { storage } from "./atual.adapter";
export type {
  RespUpload,
  RespRemove,
  RespUrlAssinada,
  RespDownload,
} from "./tipos";
