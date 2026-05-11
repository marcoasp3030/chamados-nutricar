// Adapter de queries — modo Supabase (Lovable preview).
// Reaproveita o cliente browser já configurado.

import { supabase } from "@/integrations/supabase/client";
import type { ClienteDados } from "./tipos";

export const db: ClienteDados = {
  from: supabase.from.bind(supabase),
  rpc: supabase.rpc.bind(supabase),
};
