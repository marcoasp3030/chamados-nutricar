// Chamadas HTTP para administração de usuários (VPS — evita server functions / Seroval).

export type InputCriarUsuario = {
  workspaceId: string;
  nome: string;
  email: string;
  telefone?: string | null;
  papel: string;
  cargo: string;
  departamentoIds?: string[];
};

export type InputDefinirSenha = {
  workspaceId: string;
  usuarioId: string;
  senha?: string | null;
};

export type InputAtualizarEmail = {
  workspaceId: string;
  usuarioId: string;
  email: string;
};

async function parseJson(resp: Response): Promise<Record<string, unknown>> {
  try {
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function criarUsuarioDireto(payload: {
  data: InputCriarUsuario;
}): Promise<{ email: string; senhaTemporaria: string; usuarioId?: string }> {
  const resp = await fetch("/api/admin/usuarios/criar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload.data),
  });
  const j = await parseJson(resp);
  if (!resp.ok) {
    throw new Error((j.error as string) || "Não foi possível criar o usuário.");
  }
  return {
    email: j.email as string,
    senhaTemporaria: j.senhaTemporaria as string,
    usuarioId: j.usuarioId as string | undefined,
  };
}

export async function definirSenhaUsuario(payload: {
  data: InputDefinirSenha;
}): Promise<{ senha: string }> {
  const resp = await fetch("/api/admin/usuarios/definir-senha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload.data),
  });
  const j = await parseJson(resp);
  if (!resp.ok) {
    throw new Error((j.error as string) || "Não foi possível alterar a senha.");
  }
  return { senha: j.senha as string };
}

export async function atualizarEmailUsuario(payload: {
  data: InputAtualizarEmail;
}): Promise<{ email: string }> {
  const resp = await fetch("/api/admin/usuarios/atualizar-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload.data),
  });
  const j = await parseJson(resp);
  if (!resp.ok) {
    throw new Error((j.error as string) || "Não foi possível alterar o e-mail.");
  }
  return { email: j.email as string };
}
