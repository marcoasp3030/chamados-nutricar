// Handlers HTTP de auth (evitam Seroval dos server functions no POST).
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { autenticar } from "./usuarios.server";
import { criarSessao, revogarSessao, rotacionarSessao } from "./sessoes.server";
import { gerarAccessToken, verificarAccessToken } from "./jwt.server";
import {
  setarCookiesSessao,
  lerCookieAccess,
  lerCookieRefresh,
  limparCookiesSessao,
} from "./cookies.server";
import { buscarPorId } from "./usuarios.server";

export async function executarLogin(email: string, senha: string) {
  const r = await autenticar(email, senha);
  if ("erro" in r) {
    if (r.erro === "reset_obrigatorio") {
      return { ok: false as const, erro: "reset_obrigatorio" as const };
    }
    return { ok: false as const, erro: "credenciais" as const };
  }
  const sess = await criarSessao({
    usuarioId: r.id,
    userAgent: getRequestHeader("user-agent") ?? null,
    ip: getRequestIP({ xForwardedFor: true }) ?? null,
  });
  const access = await gerarAccessToken(r);
  setarCookiesSessao(access, sess.refreshToken);
  return { ok: true as const, usuario: r };
}

export async function executarLogout() {
  const refresh = lerCookieRefresh();
  if (refresh) await revogarSessao(refresh);
  limparCookiesSessao();
  return { ok: true as const };
}

export async function obterSessaoHttp() {
  const access = lerCookieAccess();
  if (access) {
    try {
      const claims = await verificarAccessToken(access);
      const usuario = await buscarPorId(claims.sub);
      if (usuario) return { usuario };
    } catch {
      /* tenta refresh */
    }
  }
  const refresh = lerCookieRefresh();
  if (!refresh) return { usuario: null };
  const rotacionado = await rotacionarSessao(refresh);
  if (!rotacionado) {
    limparCookiesSessao();
    return { usuario: null };
  }
  const usuario = await buscarPorId(rotacionado.usuarioId);
  if (!usuario) {
    limparCookiesSessao();
    return { usuario: null };
  }
  const novoAccess = await gerarAccessToken(usuario);
  setarCookiesSessao(novoAccess, rotacionado.novoRefresh);
  return { usuario };
}
