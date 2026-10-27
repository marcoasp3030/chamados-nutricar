export const COLUNAS_OPCIONAIS_LISTA_CHAMADOS = [
  { id: "selecao", rotulo: "Seleção em massa" },
  { id: "numero", rotulo: "Número" },
  { id: "loja", rotulo: "Loja" },
  { id: "categoria", rotulo: "Categoria" },
  { id: "departamento", rotulo: "Departamento" },
  { id: "status", rotulo: "Status" },
  { id: "prioridade", rotulo: "Prioridade" },
  { id: "responsavel", rotulo: "Responsável" },
  { id: "prazo", rotulo: "Prazo" },
  { id: "proposta", rotulo: "Proposta criada" },
  { id: "atualizado", rotulo: "Atualizado" },
] as const;

export type IdColunaOpcionalListaChamados =
  (typeof COLUNAS_OPCIONAIS_LISTA_CHAMADOS)[number]["id"];

export type IdColunaListaChamados = IdColunaOpcionalListaChamados | "chamado" | "acoes";

export type VisibilidadeColunasListaChamados = Record<IdColunaOpcionalListaChamados, boolean>;

export type LargurasColunasListaChamados = Record<IdColunaListaChamados, number>;

export const VISIBILIDADE_PADRAO_COLUNAS_LISTA: VisibilidadeColunasListaChamados = {
  selecao: true,
  numero: true,
  loja: true,
  categoria: true,
  departamento: true,
  status: true,
  prioridade: true,
  responsavel: true,
  prazo: true,
  proposta: true,
  atualizado: true,
};

export const LARGURAS_PADRAO_COLUNAS_LISTA: LargurasColunasListaChamados = {
  selecao: 44,
  numero: 72,
  chamado: 300,
  loja: 120,
  categoria: 110,
  departamento: 130,
  status: 118,
  prioridade: 92,
  responsavel: 140,
  prazo: 104,
  proposta: 140,
  atualizado: 124,
  acoes: 48,
};

export const LARGURA_MINIMA_COLUNA_LISTA = 48;
export const LARGURA_MAXIMA_COLUNA_LISTA = 640;

const CHAVE_STORAGE_VISIBILIDADE = "chamados-lista-colunas:";
const CHAVE_STORAGE_LARGURAS = "chamados-lista-larguras:";

export function chaveStorageColunasLista(workspaceSlug: string) {
  return `${CHAVE_STORAGE_VISIBILIDADE}${workspaceSlug}`;
}

export function chaveStorageLargurasLista(workspaceSlug: string) {
  return `${CHAVE_STORAGE_LARGURAS}${workspaceSlug}`;
}

export function ordenarColunasVisiveisLista(
  colunasVisiveis: VisibilidadeColunasListaChamados,
  podeSelecionarEmMassa: boolean,
): IdColunaListaChamados[] {
  const ids: IdColunaListaChamados[] = [];
  if (podeSelecionarEmMassa && colunasVisiveis.selecao) ids.push("selecao");
  if (colunasVisiveis.numero) ids.push("numero");
  ids.push("chamado");
  if (colunasVisiveis.loja) ids.push("loja");
  if (colunasVisiveis.categoria) ids.push("categoria");
  if (colunasVisiveis.departamento) ids.push("departamento");
  if (colunasVisiveis.status) ids.push("status");
  if (colunasVisiveis.prioridade) ids.push("prioridade");
  if (colunasVisiveis.responsavel) ids.push("responsavel");
  if (colunasVisiveis.prazo) ids.push("prazo");
  if (colunasVisiveis.proposta) ids.push("proposta");
  if (colunasVisiveis.atualizado) ids.push("atualizado");
  ids.push("acoes");
  return ids;
}

export function somarLargurasColunas(
  ids: IdColunaListaChamados[],
  larguras: LargurasColunasListaChamados,
) {
  return ids.reduce((total, id) => total + larguras[id], 0);
}

export function lerVisibilidadeColunasLista(
  workspaceSlug: string,
): VisibilidadeColunasListaChamados {
  if (typeof window === "undefined") return { ...VISIBILIDADE_PADRAO_COLUNAS_LISTA };
  try {
    const bruto = localStorage.getItem(chaveStorageColunasLista(workspaceSlug));
    if (!bruto) return { ...VISIBILIDADE_PADRAO_COLUNAS_LISTA };
    const parsed = JSON.parse(bruto) as Partial<VisibilidadeColunasListaChamados>;
    return { ...VISIBILIDADE_PADRAO_COLUNAS_LISTA, ...parsed };
  } catch {
    return { ...VISIBILIDADE_PADRAO_COLUNAS_LISTA };
  }
}

export function salvarVisibilidadeColunasLista(
  workspaceSlug: string,
  visibilidade: VisibilidadeColunasListaChamados,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(chaveStorageColunasLista(workspaceSlug), JSON.stringify(visibilidade));
}

export function lerLargurasColunasLista(workspaceSlug: string): LargurasColunasListaChamados {
  if (typeof window === "undefined") return { ...LARGURAS_PADRAO_COLUNAS_LISTA };
  try {
    const bruto = localStorage.getItem(chaveStorageLargurasLista(workspaceSlug));
    if (!bruto) return { ...LARGURAS_PADRAO_COLUNAS_LISTA };
    const parsed = JSON.parse(bruto) as Partial<LargurasColunasListaChamados>;
    return { ...LARGURAS_PADRAO_COLUNAS_LISTA, ...parsed };
  } catch {
    return { ...LARGURAS_PADRAO_COLUNAS_LISTA };
  }
}

export function salvarLargurasColunasLista(
  workspaceSlug: string,
  larguras: LargurasColunasListaChamados,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(chaveStorageLargurasLista(workspaceSlug), JSON.stringify(larguras));
}
