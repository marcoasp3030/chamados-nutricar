// API pública de "usuário atual" para todo o frontend.
// Uso:
//   import { obterUsuarioAtualId, useUsuarioAtual, entrarComSenha, sair } from "@/auth/atual";
//
// Internamente delega para um adapter (hoje Supabase, amanhã auth próprio).
// Trocar de backend = trocar 1 arquivo (atual.adapter.ts).

import { useEffect, useState } from "react";
import {
  aoMudarSessao,
  entrarComSenha as _entrar,
  obterSessao,
  obterUsuarioAtual,
  obterUsuarioAtualId,
  sair as _sair,
  type SessaoAtual,
  type UsuarioAtual,
} from "./atual.adapter";

export type { UsuarioAtual, SessaoAtual };

export { obterSessao, obterUsuarioAtual, obterUsuarioAtualId };

export async function entrarComSenha(email: string, senha: string) {
  return _entrar(email, senha);
}

export async function sair() {
  return _sair();
}

// Hook reativo — retorna usuário corrente e atualiza ao logar/deslogar.
export function useUsuarioAtual(): {
  usuario: UsuarioAtual | null;
  carregando: boolean;
} {
  const [estado, setEstado] = useState<{
    usuario: UsuarioAtual | null;
    carregando: boolean;
  }>({ usuario: null, carregando: true });

  useEffect(() => {
    let vivo = true;
    obterSessao().then((s) => {
      if (vivo) setEstado({ usuario: s.usuario, carregando: false });
    });
    const off = aoMudarSessao((s: SessaoAtual) => {
      if (vivo) setEstado({ usuario: s.usuario, carregando: false });
    });
    return () => {
      vivo = false;
      off();
    };
  }, []);

  return estado;
}

// Atalho: só o id.
export function useUsuarioAtualId(): string | null {
  return useUsuarioAtual().usuario?.id ?? null;
}
