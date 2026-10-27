import { useCallback, useEffect, useState } from "react";
import {
  type IdColunaListaChamados,
  type IdColunaOpcionalListaChamados,
  type LargurasColunasListaChamados,
  type VisibilidadeColunasListaChamados,
  LARGURAS_PADRAO_COLUNAS_LISTA,
  VISIBILIDADE_PADRAO_COLUNAS_LISTA,
  lerLargurasColunasLista,
  lerVisibilidadeColunasLista,
  salvarLargurasColunasLista,
  salvarVisibilidadeColunasLista,
} from "@/utilitarios/colunas-lista-chamados";

export function useColunasListaChamados(workspaceSlug?: string) {
  const [colunas, setColunas] = useState<VisibilidadeColunasListaChamados>(() =>
    workspaceSlug
      ? lerVisibilidadeColunasLista(workspaceSlug)
      : { ...VISIBILIDADE_PADRAO_COLUNAS_LISTA },
  );
  const [larguras, setLarguras] = useState<LargurasColunasListaChamados>(() =>
    workspaceSlug ? lerLargurasColunasLista(workspaceSlug) : { ...LARGURAS_PADRAO_COLUNAS_LISTA },
  );

  useEffect(() => {
    if (!workspaceSlug) return;
    setColunas(lerVisibilidadeColunasLista(workspaceSlug));
    setLarguras(lerLargurasColunasLista(workspaceSlug));
  }, [workspaceSlug]);

  const alternarColuna = useCallback(
    (id: IdColunaOpcionalListaChamados, visivel: boolean) => {
      if (!workspaceSlug) return;
      setColunas((atual) => {
        const proximo = { ...atual, [id]: visivel };
        salvarVisibilidadeColunasLista(workspaceSlug, proximo);
        return proximo;
      });
    },
    [workspaceSlug],
  );

  const redimensionarColuna = useCallback(
    (id: IdColunaListaChamados, largura: number) => {
      if (!workspaceSlug) return;
      setLarguras((atual) => {
        const proximo = { ...atual, [id]: largura };
        salvarLargurasColunasLista(workspaceSlug, proximo);
        return proximo;
      });
    },
    [workspaceSlug],
  );

  const restaurarPadrao = useCallback(() => {
    if (!workspaceSlug) return;
    const visibilidadePadrao = { ...VISIBILIDADE_PADRAO_COLUNAS_LISTA };
    const largurasPadrao = { ...LARGURAS_PADRAO_COLUNAS_LISTA };
    setColunas(visibilidadePadrao);
    setLarguras(largurasPadrao);
    salvarVisibilidadeColunasLista(workspaceSlug, visibilidadePadrao);
    salvarLargurasColunasLista(workspaceSlug, largurasPadrao);
  }, [workspaceSlug]);

  return { colunas, larguras, alternarColuna, redimensionarColuna, restaurarPadrao };
}
