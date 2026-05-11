// Hash e verificação de senhas com bcrypt.
// Usado apenas no servidor (Node na VPS).
import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, ROUNDS);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(senha, hash);
}

// Marcador para usuários migrados do Supabase: força reset no primeiro login.
// (não é um hash bcrypt válido, então `verificarSenha` sempre retorna false)
export const HASH_MIGRACAO_PENDENTE = "MIGRACAO_PENDENTE_RESETAR_SENHA";
