// Adapter Supabase — usado HOJE no preview Lovable.
// Ao migrar para a VPS, basta substituir o conteúdo deste arquivo pelo
// adapter de `src/auth/atual.adapter.proprio.ts` (drop-in com a mesma API).
//
// Exporta funções "puras" (sem hooks). O hook useUsuarioAtual fica em atual.ts.

import { supabase } from "@/integrations/supabase/client";

export type UsuarioAtual = {
  id: string;
  email: string;
};

export type SessaoAtual = {
  usuario: UsuarioAtual | null;
};

export async function obterSessao(): Promise<SessaoAtual> {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  if (!u) return { usuario: null };
  return { usuario: { id: u.id, email: u.email ?? "" } };
}

export async function obterUsuarioAtual(): Promise<UsuarioAtual | null> {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  return { id: u.id, email: u.email ?? "" };
}

export async function obterUsuarioAtualId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function entrarComSenha(
  email: string,
  senha: string,
): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) {
    const msg =
      error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos."
        : error.message;
    return { ok: false, mensagem: msg };
  }
  return { ok: true };
}

export async function sair(): Promise<void> {
  await supabase.auth.signOut();
}

// Inscreve callback nas mudanças de sessão (login/logout/refresh).
// Retorna função de unsubscribe.
export function aoMudarSessao(
  cb: (sessao: SessaoAtual) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
    const u = session?.user;
    cb({
      usuario: u ? { id: u.id, email: u.email ?? "" } : null,
    });
  });
  return () => data.subscription.unsubscribe();
}
