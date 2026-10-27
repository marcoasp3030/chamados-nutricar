import type { CategoriaChamado } from "@/componentes/configuracoes/AbaCategorias";

/** Categorias fixas ao abrir chamado para o departamento Projetos. */
export const CATEGORIAS_DEPARTAMENTO_PROJETOS = [
  "Solicitação de Projeto Residencial - Novo",
  "Solicitação de Projeto Corporativo - Novo",
  "Solicitação de Projeto Residencial - Retrofit",
  "Solicitação de Projeto corporativo - Retrofit",
] as const;

export type CategoriaDepartamentoProjetos = (typeof CATEGORIAS_DEPARTAMENTO_PROJETOS)[number];

function normalizarTextoCategoria(valor: string): string {
  return valor
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function nomeEhDepartamentoProjetos(nome: string | null | undefined): boolean {
  return normalizarTextoCategoria(nome ?? "") === "projetos";
}

/** Encontra o nome canônico da lista fixa (tolera acentos e maiúsculas). */
export function encontrarCategoriaProjetosCanonica(
  categoria: string | null | undefined,
): CategoriaDepartamentoProjetos | null {
  if (!categoria?.trim()) return null;
  const alvo = normalizarTextoCategoria(categoria);
  for (const nome of CATEGORIAS_DEPARTAMENTO_PROJETOS) {
    if (normalizarTextoCategoria(nome) === alvo) return nome;
  }
  return null;
}

export function ehCategoriaDepartamentoProjetos(categoria: string | null | undefined): boolean {
  return encontrarCategoriaProjetosCanonica(categoria) !== null;
}

/**
 * Mescla categorias do banco com as 4 fixas de Projetos (sem duplicar).
 * Demais categorias do departamento continuam visíveis.
 */
export function mesclarCategoriasDepartamentoProjetos(
  categoriasBanco: CategoriaChamado[],
  departamentoId: string,
  workspaceId: string,
): CategoriaChamado[] {
  const doBanco = categoriasBanco.filter((c) => c.departamento_id === departamentoId);
  const resultado: CategoriaChamado[] = [...doBanco];

  for (const nome of CATEGORIAS_DEPARTAMENTO_PROJETOS) {
    const jaExiste = doBanco.some(
      (c) => encontrarCategoriaProjetosCanonica(c.nome) === nome,
    );
    if (jaExiste) continue;
    resultado.push({
      id: `projetos-${nome}`,
      nome,
      descricao: null,
      cor: "#6366f1",
      workspace_id: workspaceId,
      criado_em: "",
      sla_resposta_horas: null,
      sla_resolucao_horas: null,
      departamento_id: departamentoId,
    });
  }

  return resultado.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Título ao selecionar uma das 4 categorias de solicitação de projeto.
 * Demais categorias não alteram o título.
 */
export function tituloAoSelecionarCategoriaProjetos(categoria: string): string | null {
  return encontrarCategoriaProjetosCanonica(categoria);
}

const STATUS_ENCERRADOS = new Set(["Resolvido", "Fechado", "Cancelado"]);

export function chamadoEhEncerrado(status: string): boolean {
  return STATUS_ENCERRADOS.has(status);
}

/** Chamados encerrados nas 4 categorias de solicitação de projeto usam o flag proposta criada. */
export function usaFlagPropostaCriada(chamado: {
  status: string;
  categoria: string | null;
}): boolean {
  return chamadoEhEncerrado(chamado.status) && ehCategoriaDepartamentoProjetos(chamado.categoria);
}
