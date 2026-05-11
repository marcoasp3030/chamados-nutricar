// Geração e verificação de URLs assinadas para download de arquivos privados.
// Token = base64url(payload).hmac, onde payload = { b, c, e } e
// hmac = HMAC-SHA256(payload, STORAGE_URL_SECRET).
//
// As URLs apontam para /api/public/storage/<bucket>/<caminho>?token=...
// e são validadas no handler dessa rota.

import crypto from "node:crypto";
import { TTL_URL_ASSINADA_PADRAO, ehBucketValido } from "./config";

interface PayloadToken {
  b: string; // bucket
  c: string; // caminho
  e: number; // expira em (unix seconds)
}

function segredo(): string {
  const s = process.env.STORAGE_URL_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "STORAGE_URL_SECRET ausente ou < 32 caracteres. Configure no .env.",
    );
  }
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function gerarTokenAssinado(
  bucket: string,
  caminho: string,
  ttlSegundos: number = TTL_URL_ASSINADA_PADRAO,
): string {
  if (!ehBucketValido(bucket)) throw new Error(`Bucket inválido: ${bucket}`);
  const payload: PayloadToken = {
    b: bucket,
    c: caminho,
    e: Math.floor(Date.now() / 1000) + ttlSegundos,
  };
  const corpo = b64url(JSON.stringify(payload));
  const assinatura = crypto
    .createHmac("sha256", segredo())
    .update(corpo)
    .digest();
  return `${corpo}.${b64url(assinatura)}`;
}

export function verificarTokenAssinado(
  token: string,
  bucket: string,
  caminho: string,
): boolean {
  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const [corpo, assinaturaCliente] = partes;
  const esperada = crypto
    .createHmac("sha256", segredo())
    .update(corpo)
    .digest();
  let recebida: Buffer;
  try {
    recebida = fromB64url(assinaturaCliente);
  } catch {
    return false;
  }
  if (
    recebida.length !== esperada.length ||
    !crypto.timingSafeEqual(recebida, esperada)
  ) {
    return false;
  }
  let payload: PayloadToken;
  try {
    payload = JSON.parse(fromB64url(corpo).toString("utf8"));
  } catch {
    return false;
  }
  if (payload.b !== bucket || payload.c !== caminho) return false;
  if (payload.e < Math.floor(Date.now() / 1000)) return false;
  return true;
}

// Monta a URL completa usando APP_BASE_URL.
export function montarUrlAssinada(
  bucket: string,
  caminho: string,
  ttlSegundos?: number,
): string {
  const base = process.env.APP_BASE_URL?.replace(/\/+$/, "") ?? "";
  const token = gerarTokenAssinado(bucket, caminho, ttlSegundos);
  const caminhoUrl = caminho
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `${base}/api/public/storage/${encodeURIComponent(bucket)}/${caminhoUrl}?token=${token}`;
}
