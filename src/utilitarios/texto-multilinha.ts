/** Normaliza quebras vindas do banco, HTML colado ou literais \\n. */
export function normalizarTextoMultilinha(texto: string): string {
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/li>\s*<li[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Divide em parágrafos (linha em branco) e linhas dentro de cada parágrafo. */
export function paragrafosTexto(texto: string): string[][] {
  const normalizado = normalizarTextoMultilinha(texto);
  if (!normalizado) return [];
  return normalizado.split(/\n{2,}/).map((bloco) =>
    bloco.split("\n").map((l) => l.trimEnd()),
  );
}
