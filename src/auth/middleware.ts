// Middleware para proteger server functions. Usa o cookie de access token.
// Tenta refresh transparente quando o access estiver expirado.

import { createMiddleware } from "@tanstack/react-start";
import { verificarAccessToken } from "./jwt.server";
import { rotacionarSessao } from "./sessoes.server";
import { buscarPorId, type UsuarioPublico } from "./usuarios.server";
import {
  setarCookiesSessao,
  lerCookieAccess,
  lerCookieRefresh,
  limparCookiesSessao,
} from "./cookies.server";
import { gerarAccessToken } from "./jwt.server";

async function resolverUsuario(): Promise<UsuarioPublico | null> {
  const access = lerCookieAccess();
  if (access) {
    try {
      const claims = await verificarAccessToken(access);
      return await buscarPorId(claims.sub);
    } catch {
      /* tenta refresh */
    }
  }
  const refresh = lerCookieRefresh();
  if (!refresh) return null;
  const r = await rotacionarSessao(refresh);
  if (!r) {
    limparCookiesSessao();
    return null;
  }
  const u = await buscarPorId(r.usuarioId);
  if (!u) {
    limparCookiesSessao();
    return null;
  }
  const novoAccess = await gerarAccessToken(u);
  setarCookiesSessao(novoAccess, r.novoRefresh);
  return u;
}

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const usuario = await resolverUsuario();
    if (!usuario) {
      throw new Response("Unauthorized", { status: 401 });
    }
    return next({ context: { usuario, userId: usuario.id } });
  },
);

// Variante que NÃO bloqueia — só anexa o usuário se houver.
export const optionalAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const usuario = await resolverUsuario();
    return next({ context: { usuario, userId: usuario?.id ?? null } });
  },
);
