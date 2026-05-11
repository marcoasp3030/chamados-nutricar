// Tipos compartilhados pelos adapters de storage.

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

export interface BucketCliente {
  upload(
    caminho: string,
    arquivo: Blob | File,
    opcoes?: { upsert?: boolean; contentType?: string },
  ): Promise<RespUpload>;
  remove(caminhos: string[]): Promise<RespRemove>;
  createSignedUrl(caminho: string, ttlSegundos: number): Promise<RespUrlAssinada>;
  download(caminho: string): Promise<RespDownload>;
}

export interface ClienteStorage {
  from(bucket: string): BucketCliente;
}
