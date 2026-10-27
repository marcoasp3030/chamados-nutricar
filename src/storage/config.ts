// Configuração compartilhada do storage local (VPS).
// Lista de buckets permitidos e regras básicas (limite, mime types).
// Mantido isolado de Node APIs para poder ser importado tanto no server quanto
// no client (apenas constantes).

export type Bucket =
  | "chamado-anexos"
  | "checklist-anexos"
  | "avatares"
  | "logos-workspace";

export const BUCKETS: Record<
  Bucket,
  {
    publico: boolean;
    tamanhoMaxBytes: number;
    mimePermitidos?: readonly string[];
  }
> = {
  "chamado-anexos": {
    publico: false,
    tamanhoMaxBytes: 50 * 1024 * 1024, // 50 MB
  },
  "checklist-anexos": {
    publico: false,
    tamanhoMaxBytes: 25 * 1024 * 1024, // 25 MB por imagem/arquivo
  },
  avatares: {
    publico: true,
    tamanhoMaxBytes: 5 * 1024 * 1024,
    mimePermitidos: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  },
  "logos-workspace": {
    publico: true,
    tamanhoMaxBytes: 5 * 1024 * 1024,
    mimePermitidos: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  },
} as const;

export function ehBucketValido(nome: string): nome is Bucket {
  return nome in BUCKETS;
}

// Tempo padrão (em segundos) para URLs assinadas.
export const TTL_URL_ASSINADA_PADRAO = 60 * 10; // 10 min
