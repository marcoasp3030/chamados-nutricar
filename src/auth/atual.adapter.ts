// Adapter auth próprio — usa rotas HTTP (/api/auth/*) em vez de server functions.

export type UsuarioAtual = {
  id: string;
  email: string;
};

export type SessaoAtual = {
  usuario: UsuarioAtual | null;
};

async function parseJson(resp: Response): Promise<Record<string, unknown>> {
  try {
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function obterSessao(): Promise<SessaoAtual> {
  const resp = await fetch("/api/auth/session", { credentials: "include" });
  if (!resp.ok) return { usuario: null };
  const j = await parseJson(resp);
  const u = j.usuario as { id?: string; email?: string } | null | undefined;
  if (!u?.id) return { usuario: null };
  return { usuario: { id: u.id, email: u.email ?? "" } };
}

export async function obterUsuarioAtual(): Promise<UsuarioAtual | null> {
  const s = await obterSessao();
  return s.usuario;
}

export async function obterUsuarioAtualId(): Promise<string | null> {
  return (await obterSessao()).usuario?.id ?? null;
}

export async function entrarComSenha(
  email: string,
  senha: string,
): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const resp = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, senha }),
  });
  const j = await parseJson(resp);
  if (!resp.ok || j.ok === false) {
    const mensagem =
      j.erro === "reset_obrigatorio"
        ? "Você precisa redefinir sua senha antes de entrar."
        : "E-mail ou senha incorretos.";
    return { ok: false, mensagem };
  }
  return { ok: true };
}

export async function sair(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export function aoMudarSessao(
  _cb: (sessao: SessaoAtual) => void,
): () => void {
  return () => {};
}
