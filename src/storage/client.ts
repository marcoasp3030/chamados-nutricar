// Wrapper client-side com API parecida ao `supabase.storage.from(bucket)`.
// Permite trocar `supabase.storage.from(b).upload(...)` por
// `storage.from(b).upload(...)` sem mudar muito código.
//
// Internamente chama as server functions definidas em storage.functions.ts.

import {
  uploadArquivo,
  removerArquivos,
  gerarUrlAssinadaArquivo,
  baixarArquivo,
} from "./storage.functions";

async function arquivoParaBase64(arquivo: Blob): Promise<string> {
  const buf = new Uint8Array(await arquivo.arrayBuffer());
  // btoa não aceita strings grandes; processa em chunks.
  let bin = "";
  const tamChunk = 0x8000;
  for (let i = 0; i < buf.length; i += tamChunk) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(buf.subarray(i, i + tamChunk)) as unknown as number[],
    );
  }
  return btoa(bin);
}

function base64ParaBlob(b64: string, tipo = "application/octet-stream"): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: tipo });
}

export interface RespUpload {
  data: { path: string } | null;
  error: { message: string } | null;
}

export interface RespRemove {
  data: { caminhos: string[] } | null;
  error: { message: string } | null;
}

export interface RespUrlAssinada {
  data: { signedUrl: string } | null;
  error: { message: string } | null;
}

export interface RespDownload {
  data: Blob | null;
  error: { message: string } | null;
}

class StorageBucket {
  constructor(private bucket: string) {}

  async upload(
    caminho: string,
    arquivo: Blob | File,
    opcoes?: { upsert?: boolean; contentType?: string },
  ): Promise<RespUpload> {
    try {
      const conteudoBase64 = await arquivoParaBase64(arquivo);
      const mimeType =
        opcoes?.contentType ??
        (arquivo as File).type ??
        "application/octet-stream";
      const r = await uploadArquivo({
        data: {
          bucket: this.bucket,
          caminho,
          nomeOriginal: (arquivo as File).name ?? caminho.split("/").pop()!,
          mimeType,
          conteudoBase64,
          upsert: opcoes?.upsert,
        },
      });
      return { data: { path: r.caminho }, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? "Falha no upload" } };
    }
  }

  async remove(caminhos: string[]): Promise<RespRemove> {
    try {
      await removerArquivos({ data: { bucket: this.bucket, caminhos } });
      return { data: { caminhos }, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? "Falha ao remover" } };
    }
  }

  async createSignedUrl(
    caminho: string,
    ttlSegundos: number,
  ): Promise<RespUrlAssinada> {
    try {
      const r = await gerarUrlAssinadaArquivo({
        data: { bucket: this.bucket, caminho, ttlSegundos },
      });
      return { data: { signedUrl: r.url }, error: null };
    } catch (e: any) {
      return {
        data: null,
        error: { message: e?.message ?? "Falha ao gerar URL" },
      };
    }
  }

  async download(caminho: string): Promise<RespDownload> {
    try {
      const r = await baixarArquivo({
        data: { bucket: this.bucket, caminho },
      });
      return {
        data: base64ParaBlob(r.conteudoBase64),
        error: null,
      };
    } catch (e: any) {
      return {
        data: null,
        error: { message: e?.message ?? "Falha no download" },
      };
    }
  }
}

export const storage = {
  from(bucket: string) {
    return new StorageBucket(bucket);
  },
};
