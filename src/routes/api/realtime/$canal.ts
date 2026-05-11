// Endpoint SSE para realtime: /api/realtime/<canal>
//
// O cliente abre uma conexão `EventSource` aqui; o servidor mantém a conexão
// aberta e envia "data: <json>\n\n" sempre que `busRealtime.publicar(canal, ...)`
// for chamado.
//
// Auth: cookie de sessão (Fase 2). Autorização por canal (autorizacao.server).

import { createFileRoute } from "@tanstack/react-router";
import { lerCookieAccess } from "@/auth/cookies.server";
import { verificarAccessToken } from "@/auth/jwt.server";
import { busRealtime } from "@/realtime/bus.server";
import { autorizarCanal } from "@/realtime/autorizacao.server";

export const Route = createFileRoute("/api/realtime/$canal")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const canal = params.canal;
        if (!canal) return new Response("canal obrigatório", { status: 400 });

        // Autenticação via cookie
        const access = lerCookieAccess();
        if (!access) return new Response("Unauthorized", { status: 401 });
        let userId: string;
        try {
          const claims = await verificarAccessToken(access);
          userId = claims.sub;
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }

        const ok = await autorizarCanal(canal, userId);
        if (!ok) return new Response("Forbidden", { status: 403 });

        const encoder = new TextEncoder();
        let cancelar: (() => void) | null = null;
        let pingInterval: ReturnType<typeof setInterval> | null = null;

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const enviar = (linha: string) => {
              try {
                controller.enqueue(encoder.encode(linha));
              } catch {
                /* conexão fechada */
              }
            };

            // Comentário inicial para abrir o stream
            enviar(`: conectado\n\n`);

            cancelar = busRealtime.inscrever(canal, (evt) => {
              enviar(`event: ${evt.evento}\n`);
              enviar(`data: ${JSON.stringify(evt)}\n\n`);
            });

            // Heartbeat — evita o cliente/proxy fechar por idle
            pingInterval = setInterval(() => enviar(`: ping\n\n`), 25_000);

            // Encerramento iniciado pelo cliente
            request.signal.addEventListener("abort", () => {
              cancelar?.();
              if (pingInterval) clearInterval(pingInterval);
              try {
                controller.close();
              } catch {
                /* já fechado */
              }
            });
          },
          cancel() {
            cancelar?.();
            if (pingInterval) clearInterval(pingInterval);
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
