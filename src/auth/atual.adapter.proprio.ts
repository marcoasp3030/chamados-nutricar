// Adapter para o auth próprio (Fase 2 — VPS).
// Para ativar: copie o conteúdo deste arquivo por cima de `atual.adapter.ts`.
//
// API idêntica ao adapter Supabase — nenhuma tela precisa mudar.

import {
  signIn as fnSignIn,
  signOut as fnSignOut,
  getSession as fnGetSession,
} from "@/auth/auth.functions";

export type UsuarioAtual = {
  id: string;
  email: string;
};

export type SessaoAtual = {
  usuario: UsuarioAtual | null;
};

export async function obterSessao(): Promise<SessaoAtual> {
  const r = await fnGetSession();
  if (!r.usuario) return { usuario: null };
  return { usuario: { id: r.usuario.id, email: r.usuario.email } };
}

export async function obterUsuarioAtual(): Promise<UsuarioAtual | null> {
  const r = await fnGetSession();
  if (!r.usuario) return null;
  return { id: r.usuario.id, email: r.usuario.email };
}

export async function obterUsuarioAtualId(): Promise<string | null> {
  const r = await fnGetSession();
  return r.usuario?.id ?? null;
}

export async function entrarComSenha(
  email: string,
  senha: string,
): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const r = await fnSignIn({ data: { email, senha } });
  if (!r.ok) {
    const mensagem =
      r.erro === "reset_obrigatorio"
        ? "Você precisa redefinir sua senha antes de entrar."
        : "E-mail ou senha incorretos.";
    return { ok: false, mensagem };
  }
  return { ok: true };
}

export async function sair(): Promise<void> {
  await fnSignOut();
}

// Sem WebSocket de auth no backend próprio — fazemos polling leve via
// invalidação manual após signIn/signOut. Quem precisar de reatividade
// chama `obterSessao()` novamente.
export function aoMudarSessao(
  _cb: (sessao: SessaoAtual) => void,
): () => void {
  return () => {};
}
