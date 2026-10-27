// Adapter storage local (disco /data/storage) — substitui Supabase Storage.

import { storage as storageVps } from "./client";
import type { ClienteStorage } from "./tipos";

export const storage: ClienteStorage = storageVps;
