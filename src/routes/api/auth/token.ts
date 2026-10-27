// GET /api/auth/token — devolve JWT curto para o PostgREST (cookie httpOnly → Bearer).
import { createFileRoute } from "@tanstack/react-router";
import { lerCookieAccess, lerCookieRefresh, limparCookiesSessao, setarCookiesSessao } from "@/auth/cookies.server";
import { gerarAccessToken, verificarAccessToken, TTL } from "@/auth/jwt.server";
import { rotacionarSessao } from "@/auth/sessoes.server";
import { buscarPorId } from "@/auth/usuarios.server";

export const Route = createFileRoute("/api/auth/token")({
  server: {
    handlers: {
      GET: async () => {
        const access = lerCookieAccess();
        if (access) {
          try {
            const claims = await verificarAccessToken(access);
            // Tokens emitidos antes do cutover não tinham `role` — PostgREST usa anon e RLS falha.
            if (claims.role === "authenticated") {
              const exp = claims.exp ?? Math.floor(Date.now() / 1000) + TTL.ACCESS_SEG;
              return Response.json({ token: access, expira_em: exp });
            }
            const usuario = await buscarPorId(claims.sub!);
            if (usuario) {
              const refresh = lerCookieRefresh();
              const novoAccess = await gerarAccessToken(usuario);
              if (refresh) setarCookiesSessao(novoAccess, refresh);
              const exp = Math.floor(Date.now() / 1000) + TTL.ACCESS_SEG;
              return Response.json({ token: novoAccess, expira_em: exp });
            }
          } catch {
            /* tenta refresh */
          }
        }

        const refresh = lerCookieRefresh();
        if (!refresh) {
          return new Response("Unauthorized", { status: 401 });
        }

        const rotacionado = await rotacionarSessao(refresh);
        if (!rotacionado) {
          limparCookiesSessao();
          return new Response("Unauthorized", { status: 401 });
        }

        const usuario = await buscarPorId(rotacionado.usuarioId);
        if (!usuario) {
          limparCookiesSessao();
          return new Response("Unauthorized", { status: 401 });
        }

        const novoAccess = await gerarAccessToken(usuario);
        setarCookiesSessao(novoAccess, rotacionado.novoRefresh);
        const exp = Math.floor(Date.now() / 1000) + TTL.ACCESS_SEG;
        return Response.json({ token: novoAccess, expira_em: exp });
      },
    },
  },
});
