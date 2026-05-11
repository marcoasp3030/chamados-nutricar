// Adapter próprio (VPS) — chama as server fns de src/storage/storage.functions.ts.
// API idêntica ao adapter Supabase. Para ativar:
//   cp src/storage/atual.adapter.proprio.ts src/storage/atual.adapter.ts

import { storage as storageVps } from "./client";
import type { ClienteStorage } from "./tipos";

export const storage: ClienteStorage = storageVps;
