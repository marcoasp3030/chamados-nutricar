// Adapter Supabase de storage — usado HOJE no preview Lovable.
// Cutover: substituir conteúdo deste arquivo por `atual.adapter.proprio.ts`.

import { supabase } from "@/integrations/supabase/client";
import type {
  BucketCliente,
  ClienteStorage,
  RespDownload,
  RespRemove,
  RespUpload,
  RespUrlAssinada,
} from "./tipos";

class BucketSupabase implements BucketCliente {
  constructor(private bucket: string) {}

  async upload(
    caminho: string,
    arquivo: Blob | File,
    opcoes?: { upsert?: boolean; contentType?: string },
  ): Promise<RespUpload> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(caminho, arquivo, {
        upsert: opcoes?.upsert,
        contentType: opcoes?.contentType,
      });
    if (error) return { data: null, error: { message: error.message } };
    return { data: { path: data.path }, error: null };
  }

  async remove(caminhos: string[]): Promise<RespRemove> {
    const { error } = await supabase.storage.from(this.bucket).remove(caminhos);
    if (error) return { data: null, error: { message: error.message } };
    return { data: { caminhos }, error: null };
  }

  async createSignedUrl(
    caminho: string,
    ttlSegundos: number,
  ): Promise<RespUrlAssinada> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(caminho, ttlSegundos);
    if (error) return { data: null, error: { message: error.message } };
    return { data: { signedUrl: data.signedUrl }, error: null };
  }

  async download(caminho: string): Promise<RespDownload> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .download(caminho);
    if (error) return { data: null, error: { message: error.message } };
    return { data, error: null };
  }
}

export const storage: ClienteStorage = {
  from(bucket: string) {
    return new BucketSupabase(bucket);
  },
};
