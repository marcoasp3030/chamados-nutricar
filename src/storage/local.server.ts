// Storage local em disco (para rodar na VPS).
// A raiz fica em STORAGE_DIR (ex.: /var/lib/chamados-storage).
// Cada bucket vira um diretório. O caminho lógico vira subpath dentro do bucket.
//
// Importante: este módulo só roda no servidor. Nunca importe no client.

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { BUCKETS, ehBucketValido, type Bucket } from "./config";

function raiz(): string {
  const r = process.env.STORAGE_DIR;
  if (!r) {
    throw new Error(
      "STORAGE_DIR não configurado. Defina o caminho do volume no .env (ex.: /var/lib/chamados-storage).",
    );
  }
  return r;
}

// Bloqueia path traversal: rejeita ".." ou caminhos absolutos.
function normalizarCaminho(caminho: string): string {
  if (!caminho || caminho.startsWith("/") || caminho.includes("..")) {
    throw new Error("Caminho inválido.");
  }
  // Normaliza separadores e remove barras duplicadas.
  const limpo = path.posix.normalize(caminho).replace(/^\/+/, "");
  if (limpo.startsWith("..") || limpo.includes("/../")) {
    throw new Error("Caminho inválido.");
  }
  return limpo;
}

function caminhoFisico(bucket: Bucket, caminho: string): string {
  const seguro = normalizarCaminho(caminho);
  return path.join(raiz(), bucket, seguro);
}

export async function salvarArquivo(opts: {
  bucket: string;
  caminho: string;
  conteudo: Buffer | Uint8Array;
  mimeType?: string | null;
  upsert?: boolean;
}): Promise<{ caminho: string; tamanho: number }> {
  if (!ehBucketValido(opts.bucket)) {
    throw new Error(`Bucket inválido: ${opts.bucket}`);
  }
  const cfg = BUCKETS[opts.bucket];
  const buf = Buffer.from(opts.conteudo);
  if (buf.byteLength > cfg.tamanhoMaxBytes) {
    throw new Error(
      `Arquivo excede tamanho máximo (${Math.floor(cfg.tamanhoMaxBytes / 1024 / 1024)} MB).`,
    );
  }
  if (
    cfg.mimePermitidos &&
    opts.mimeType &&
    !cfg.mimePermitidos.includes(opts.mimeType)
  ) {
    throw new Error(`Tipo de arquivo não permitido: ${opts.mimeType}`);
  }
  const destino = caminhoFisico(opts.bucket, opts.caminho);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  if (!opts.upsert) {
    try {
      await fs.access(destino);
      throw new Error("Arquivo já existe (upsert=false).");
    } catch (e: any) {
      if (e?.code !== "ENOENT") throw e;
    }
  }
  await fs.writeFile(destino, buf);
  return { caminho: normalizarCaminho(opts.caminho), tamanho: buf.byteLength };
}

export async function lerArquivo(
  bucket: string,
  caminho: string,
): Promise<{ conteudo: Buffer; tamanho: number }> {
  if (!ehBucketValido(bucket)) throw new Error(`Bucket inválido: ${bucket}`);
  const destino = caminhoFisico(bucket, caminho);
  const conteudo = await fs.readFile(destino);
  return { conteudo, tamanho: conteudo.byteLength };
}

export async function removerArquivo(
  bucket: string,
  caminhos: string[],
): Promise<void> {
  if (!ehBucketValido(bucket)) throw new Error(`Bucket inválido: ${bucket}`);
  await Promise.all(
    caminhos.map(async (c) => {
      try {
        await fs.unlink(caminhoFisico(bucket, c));
      } catch (e: any) {
        if (e?.code !== "ENOENT") throw e;
      }
    }),
  );
}

export async function existeArquivo(
  bucket: string,
  caminho: string,
): Promise<boolean> {
  if (!ehBucketValido(bucket)) return false;
  try {
    await fs.access(caminhoFisico(bucket, caminho));
    return true;
  } catch {
    return false;
  }
}

// Gera um caminho único do tipo `<prefixo>/<uuid>.<ext>` para evitar colisões.
export function gerarCaminhoUnico(
  prefixo: string,
  nomeOriginal: string,
): string {
  const ext = path.extname(nomeOriginal).toLowerCase().replace(/[^.\w]/g, "");
  const id = crypto.randomUUID();
  const limpo = normalizarCaminho(`${prefixo}/${id}${ext}`);
  return limpo;
}
