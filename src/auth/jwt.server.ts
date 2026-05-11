// Geração e verificação de JWT (HS256) usando `jose`.
// Access token curto (15 min) + refresh token longo (30 dias) armazenado em sessoes.
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { randomBytes, createHash } from "crypto";

const ACCESS_TTL_SEG = 60 * 15; // 15 minutos
const REFRESH_TTL_SEG = 60 * 60 * 24 * 30; // 30 dias

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "JWT_SECRET ausente ou muito curto (mín. 32 chars). Defina no .env.",
    );
  }
  return new TextEncoder().encode(s);
}

export interface ClaimsAcesso extends JWTPayload {
  sub: string; // usuario.id
  email: string;
}

export async function gerarAccessToken(usuario: {
  id: string;
  email: string;
}): Promise<string> {
  return new SignJWT({ email: usuario.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuario.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEG}s`)
    .sign(getSecret());
}

export async function verificarAccessToken(token: string): Promise<ClaimsAcesso> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
  if (!payload.sub || typeof payload.email !== "string") {
    throw new Error("Token inválido: faltam claims");
  }
  return payload as ClaimsAcesso;
}

// Refresh tokens são opacos (random base64url), guardamos só o hash sha256.
export function gerarRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const TTL = { ACCESS_SEG: ACCESS_TTL_SEG, REFRESH_SEG: REFRESH_TTL_SEG };
