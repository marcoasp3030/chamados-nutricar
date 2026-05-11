// Helpers de cookies para tokens. Usar SOMENTE em server functions / rotas.
import { setCookie, getCookie, deleteCookie } from "@tanstack/react-start/server";
import { TTL } from "./jwt.server";

export const COOKIE_ACCESS = "nut_access";
export const COOKIE_REFRESH = "nut_refresh";

const baseOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setarCookiesSessao(accessToken: string, refreshToken: string) {
  setCookie(COOKIE_ACCESS, accessToken, { ...baseOpts, maxAge: TTL.ACCESS_SEG });
  setCookie(COOKIE_REFRESH, refreshToken, { ...baseOpts, maxAge: TTL.REFRESH_SEG });
}

export function lerCookieAccess(): string | undefined {
  return getCookie(COOKIE_ACCESS);
}

export function lerCookieRefresh(): string | undefined {
  return getCookie(COOKIE_REFRESH);
}

export function limparCookiesSessao() {
  deleteCookie(COOKIE_ACCESS, { path: "/" });
  deleteCookie(COOKIE_REFRESH, { path: "/" });
}
