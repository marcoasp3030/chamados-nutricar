/** Erros típicos quando o HTML referencia chunks antigos após um deploy. */
export function ehErroCarregamentoChunk(erro: unknown): boolean {
  const mensagem =
    erro instanceof Error
      ? `${erro.name}: ${erro.message}`
      : typeof erro === "string"
        ? erro
        : String(erro);

  return (
    /Failed to fetch dynamically imported module/i.test(mensagem) ||
    /Importing a module script failed/i.test(mensagem) ||
    /error loading dynamically imported module/i.test(mensagem) ||
    /Loading chunk [\d]+ failed/i.test(mensagem) ||
    /ChunkLoadError/i.test(mensagem) ||
    /Unable to preload CSS/i.test(mensagem)
  );
}

const CHAVE_RECARGA = "nutricar_recarga_pos_deploy";

/** Recarrega a página uma vez por sessão quando detecta chunk/asset ausente. */
export function tentarRecarregarPosDeploy(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(CHAVE_RECARGA)) return false;
  sessionStorage.setItem(CHAVE_RECARGA, "1");
  window.location.reload();
  return true;
}
