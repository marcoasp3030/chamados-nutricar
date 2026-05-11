// Server functions de auth — chamadas pelo frontend via useServerFn.
// IMPORTANTE: estes endpoints só funcionam em runtime Node (VPS), pois usam
// `db` (Postgres direto) e cookies do servidor TanStack. No preview Lovable
// atual (Cloudflare + Supabase) eles NÃO são chamados — convivem em paralelo.

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  autenticar,
  atualizarSenha,
  buscarPorId,
  criarUsuario,
} from "./usuarios.server";
import { criarSessao, revogarSessao, rotacionarSessao } from "./sessoes.server";
import { gerarAccessToken, verificarAccessToken } from "./jwt.server";
import {
  setarCookiesSessao,
  lerCookieAccess,
  lerCookieRefresh,
  limparCookiesSessao,
} from "./cookies.server";
import { gerarTokenReset, verificarTokenReset } from "./reset.server";

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const senhaSchema = z.string().min(8).max(128);

// ---------- SIGN UP ----------
export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: emailSchema,
        senha: senhaSchema,
        nome: z.string().trim().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const usuario = await criarUsuario(data);
    const sess = await criarSessao({
      usuarioId: usuario.id,
      userAgent: getRequestHeader("user-agent") ?? null,
      ip: getRequestIP({ xForwardedFor: true }) ?? null,
    });
    const access = await gerarAccessToken(usuario);
    setarCookiesSessao(access, sess.refreshToken);
    return { usuario };
  });

// ---------- SIGN IN ----------
export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: emailSchema, senha: senhaSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const r = await autenticar(data.email, data.senha);
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
  });

// ---------- SIGN OUT ----------
export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const refresh = lerCookieRefresh();
  if (refresh) await revogarSessao(refresh);
  limparCookiesSessao();
  return { ok: true };
});

// ---------- GET SESSION (refresca se preciso) ----------
export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  // 1) tenta access token
  const access = lerCookieAccess();
  if (access) {
    try {
      const claims = await verificarAccessToken(access);
      const usuario = await buscarPorId(claims.sub);
      if (usuario) return { usuario };
    } catch {
      // expirou — cai para refresh
    }
  }
  // 2) tenta refresh
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
});

// ---------- REQUEST PASSWORD RESET ----------
// Retorna SEMPRE ok=true para não vazar quais e-mails existem.
// Em produção, despachar e-mail com link contendo o token.
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: emailSchema }).parse(d))
  .handler(async ({ data }) => {
    const { autenticar: _, buscarPorEmail } = await import("./usuarios.server");
    const u = await buscarPorEmail(data.email);
    if (u) {
      const token = await gerarTokenReset(u.id);
      // TODO (Fase 5): integrar com sistema de e-mail.
      console.log(
        `[auth] Token de reset para ${data.email}: ${process.env.APP_BASE_URL ?? ""}/redefinir-senha?token=${token}`,
      );
    }
    return { ok: true };
  });

// ---------- RESET PASSWORD ----------
export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string().min(10), novaSenha: senhaSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const usuarioId = await verificarTokenReset(data.token);
    await atualizarSenha(usuarioId, data.novaSenha);
    // Por segurança, invalida todas as sessões ativas após troca de senha.
    const { revogarTodasSessoesDoUsuario } = await import("./sessoes.server");
    await revogarTodasSessoesDoUsuario(usuarioId);
    return { ok: true };
  });
