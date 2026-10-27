import type { LocalVmpay } from "@/tipos/vmpay";

function normalizarNomeLoja(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buscarLocalPorNomeLoja(
  locais: LocalVmpay[],
  nomeLoja: string | null | undefined,
): LocalVmpay | null {
  if (!nomeLoja?.trim()) return null;
  const alvo = normalizarNomeLoja(nomeLoja);
  return locais.find((l) => normalizarNomeLoja(l.name) === alvo) ?? null;
}

/** Endereço em linhas para exibição no detalhe do chamado. */
export function formatarEnderecoLocal(local: LocalVmpay): string[] {
  const linhas: string[] = [];
  const rua = [local.street, local.number].filter(Boolean).join(", ");
  if (rua) linhas.push(rua);
  if (local.complement) linhas.push(local.complement);
  const cidade = [local.neighborhood, local.city, local.state].filter(Boolean).join(" — ");
  if (cidade) linhas.push(cidade);
  if (local.zip_code) linhas.push(`CEP ${local.zip_code}`);
  return linhas;
}

export function linkMapaLocal(local: LocalVmpay): string | null {
  if (local.latitude != null && local.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${local.latitude},${local.longitude}`;
  }
  const linhas = formatarEnderecoLocal(local);
  if (linhas.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(linhas.join(", "))}`;
}
