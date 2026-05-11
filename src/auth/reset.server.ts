// Tokens de reset de senha (válidos por 1h).
// Token opaco assinado em JWT separado para não precisar de tabela extra.
import { SignJWT, jwtVerify } from "jose";

const TTL_SEG = 60 * 60; // 1h

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET ausente");
  // namespace diferente para não colidir com access tokens
  return new TextEncoder().encode(s + ":reset");
}

export async function gerarTokenReset(usuarioId: string): Promise<string> {
  return new SignJWT({ tipo: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuarioId)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SEG}s`)
    .sign(getSecret());
}

export async function verificarTokenReset(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
  if (payload.tipo !== "reset" || !payload.sub) throw new Error("Token de reset inválido");
  return payload.sub as string;
}
