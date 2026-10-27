import type { PapelMembro } from "@/tipos/workspace";

export function ehPapelSuporte(papel: PapelMembro | string | undefined): boolean {
  return papel === "Suporte";
}

/** Rotas permitidas para usuários com papel Suporte. */
export function rotaPermitidaSuporte(pathname: string, slug: string): boolean {
  const base = `/w/${slug}`;
  if (pathname === base || pathname === `${base}/`) return false;
  if (pathname.startsWith(`${base}/suporte`)) return true;
  if (/^\/w\/[^/]+\/chamados\/\d+\/?$/.test(pathname)) return true;
  return false;
}

export function rotaInicialPorPapel(papel: PapelMembro): "/w/$slug/painel" | "/w/$slug/suporte" {
  return ehPapelSuporte(papel) ? "/w/$slug/suporte" : "/w/$slug/painel";
}
