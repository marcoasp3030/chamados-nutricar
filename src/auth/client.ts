// Cliente browser para o auth próprio (versão VPS).
// Drop-in mínimo para substituir `supabase.auth.*` quando fizermos o cutover.
//
// Uso (após Fase 8):
//   import { authClient } from "@/auth/client";
//   const { usuario } = await authClient.getSession();
//
// Por enquanto é um wrapper sobre as server functions Tanstack.

import { useServerFn } from "@tanstack/react-start";
import {
  signIn as fnSignIn,
  signUp as fnSignUp,
  signOut as fnSignOut,
  getSession as fnGetSession,
  requestPasswordReset as fnRequestReset,
  resetPassword as fnResetPassword,
} from "./auth.functions";

export type Usuario = { id: string; email: string; emailVerificado: boolean };

export const authClient = {
  signIn: (email: string, senha: string) =>
    fnSignIn({ data: { email, senha } }),
  signUp: (email: string, senha: string, nome?: string) =>
    fnSignUp({ data: { email, senha, nome } }),
  signOut: () => fnSignOut(),
  getSession: () => fnGetSession(),
  requestPasswordReset: (email: string) =>
    fnRequestReset({ data: { email } }),
  resetPassword: (token: string, novaSenha: string) =>
    fnResetPassword({ data: { token, novaSenha } }),
};

// Hooks utilitários para componentes React
export function useAuthFns() {
  return {
    signIn: useServerFn(fnSignIn),
    signUp: useServerFn(fnSignUp),
    signOut: useServerFn(fnSignOut),
    getSession: useServerFn(fnGetSession),
    requestPasswordReset: useServerFn(fnRequestReset),
    resetPassword: useServerFn(fnResetPassword),
  };
}
