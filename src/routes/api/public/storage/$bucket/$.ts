// Servidor de download para URLs assinadas: /api/public/storage/<bucket>/<caminho>?token=...
// Verifica o HMAC do token; se válido e não expirado, devolve o arquivo do disco.
// Esta rota é pública (sem auth) porque a autorização está embutida no token.

import { createFileRoute } from "@tanstack/react-router";
import { lerArquivo } from "@/storage/local.server";
import { verificarTokenAssinado } from "@/storage/url-assinada.server";

export const Route = createFileRoute("/api/public/storage/$bucket/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const bucket = params.bucket;
        const caminho = (params as { _splat?: string })._splat ?? "";

        if (!token || !bucket || !caminho) {
          return new Response("Parâmetros ausentes", { status: 400 });
        }
        if (!verificarTokenAssinado(token, bucket, caminho)) {
          return new Response("Token inválido ou expirado", { status: 401 });
        }
        try {
          const r = await lerArquivo(bucket, caminho);
          return new Response(new Uint8Array(r.conteudo), {
            status: 200,
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Length": String(r.tamanho),
              "Cache-Control": "private, max-age=60",
            },
          });
        } catch (e: any) {
          if (e?.code === "ENOENT") {
            return new Response("Arquivo não encontrado", { status: 404 });
          }
          return new Response("Erro ao ler arquivo", { status: 500 });
        }
      },
    },
  },
});
