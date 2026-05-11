// Adapter de queries — modo Supabase (Lovable preview).
// Reaproveita o cliente browser já configurado.

import { supabase } from "@/integrations/supabase/client";
import type { ClienteDados } from "./tipos";

export const dados: ClienteDados = {
  from: supabase.from.bind(supabase),
  rpc: supabase.rpc.bind(supabase),
};
