// Server functions expostas ao client para upload/download/remoção de arquivos.
// Substitui as chamadas a `supabase.storage.from(...)` no front-end na VPS.
//
// Importante: a autorização real (quem pode ver/escrever em qual bucket/caminho)
// é responsabilidade dos repos de domínio (ex.: chamados.repo.ts ao registrar
// o anexo). Aqui validamos apenas que o usuário está autenticado e que os
// limites do bucket (tamanho/mime) são respeitados.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/auth/middleware.server";
import {
  salvarArquivo,
  lerArquivo,
  removerArquivo,
  gerarCaminhoUnico,
} from "./local.server";
import { montarUrlAssinada } from "./url-assinada.server";
import { ehBucketValido, TTL_URL_ASSINADA_PADRAO } from "./config";

const SchemaUpload = z.object({
  bucket: z.string().min(1).max(64),
  caminho: z.string().min(1).max(512).optional(),
  prefixo: z.string().min(1).max(256).optional(),
  nomeOriginal: z.string().min(1).max(256),
  mimeType: z.string().max(128).nullable().optional(),
  // base64 do conteúdo (TanStack server fn não transporta Blob direto).
  conteudoBase64: z.string().min(1),
  upsert: z.boolean().optional(),
});

export const uploadArquivo = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => SchemaUpload.parse(input))
  .handler(async ({ data }) => {
    if (!ehBucketValido(data.bucket)) {
      throw new Error(`Bucket inválido: ${data.bucket}`);
    }
    const caminho =
      data.caminho ??
      gerarCaminhoUnico(data.prefixo ?? "geral", data.nomeOriginal);
    const buf = Buffer.from(data.conteudoBase64, "base64");
    const r = await salvarArquivo({
      bucket: data.bucket,
      caminho,
      conteudo: buf,
      mimeType: data.mimeType ?? null,
      upsert: data.upsert ?? true,
    });
    return { caminho: r.caminho, tamanho: r.tamanho };
  });

const SchemaRemover = z.object({
  bucket: z.string().min(1).max(64),
  caminhos: z.array(z.string().min(1).max(512)).min(1).max(100),
});

export const removerArquivos = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => SchemaRemover.parse(input))
  .handler(async ({ data }) => {
    await removerArquivo(data.bucket, data.caminhos);
    return { ok: true };
  });

const SchemaUrl = z.object({
  bucket: z.string().min(1).max(64),
  caminho: z.string().min(1).max(512),
  ttlSegundos: z.number().int().positive().max(60 * 60 * 24).optional(),
});

export const gerarUrlAssinadaArquivo = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => SchemaUrl.parse(input))
  .handler(async ({ data }) => {
    const url = montarUrlAssinada(
      data.bucket,
      data.caminho,
      data.ttlSegundos ?? TTL_URL_ASSINADA_PADRAO,
    );
    return { url };
  });

const SchemaDownload = z.object({
  bucket: z.string().min(1).max(64),
  caminho: z.string().min(1).max(512),
});

// Download direto via server function (retorna base64 — útil em fluxos
// administrativos). Para o caso comum, prefira `gerarUrlAssinadaArquivo`.
export const baixarArquivo = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => SchemaDownload.parse(input))
  .handler(async ({ data }) => {
    const r = await lerArquivo(data.bucket, data.caminho);
    return {
      conteudoBase64: r.conteudo.toString("base64"),
      tamanho: r.tamanho,
    };
  });
