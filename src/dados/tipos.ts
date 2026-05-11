// Tipos da camada de dados (queries).
// A API espelha o `supabase.from()` / `supabase.rpc()` para que o
// frontend não precise saber quem está respondendo (Supabase ou VPS).

import type { SupabaseClient } from "@supabase/supabase-js";

/** Subconjunto público do cliente que o frontend pode usar. */
export interface ClienteDados {
  from: SupabaseClient["from"];
  rpc: SupabaseClient["rpc"];
}
