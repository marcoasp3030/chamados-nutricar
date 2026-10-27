// Geração e verificação de JWT (HS256) usando `jose`.
// Sessão persistente: duração configurável via SESSION_TTL_DIAS (padrão 365 dias).
// Access e refresh usam o mesmo TTL — sem deslogar por inatividade antes desse prazo.
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { randomBytes, createHash } from "crypto";

function lerTtlSegundos(): number {
  const dias = Number(process.env.SESSION_TTL_DIAS ?? "365");
  if (!Number.isFinite(dias) || dias <= 0) {
    return 60 * 60 * 24 * 365;
  }
  return Math.floor(dias * 24 * 60 * 60);
}

const SESSAO_TTL_SEG = lerTtlSegundos();
const ACCESS_TTL_SEG = SESSAO_TTL_SEG;
const REFRESH_TTL_SEG = SESSAO_TTL_SEG;

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
  role?: string;
}

export async function gerarAccessToken(usuario: {
  id: string;
  email: string;
}): Promise<string> {
  return new SignJWT({ email: usuario.email, role: "authenticated" })
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
