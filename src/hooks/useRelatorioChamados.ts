import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { db } from "@/dados/atual";
import type { Chamado } from "@/tipos/chamado";

const TAMANHO_PAGINA = 1000;
/** Trava de segurança para não carregar volumes absurdos no navegador. */
export const LIMITE_RELATORIO = 50_000;

const COLUNAS =
  "id, workspace_id, numero, codigo, titulo, status, prioridade, tipo, categoria, loja, departamento_id, departamento_origem_id, solicitante_id, responsavel_id, chamado_pai_id, prazo, primeiro_resposta_em, resolvido_em, fechado_em, criado_em, atualizado_em, tags, criado_por";

export interface ResultadoRelatorio {
  chamados: Chamado[];
  /** true quando a trava de segurança cortou o resultado. */
  truncado: boolean;
}

/**
 * Busca (paginando) todos os chamados do workspace que tenham QUALQUER evento
 * (abertura, resolução, fechamento ou prazo) dentro da janela. A visibilidade
 * por usuário continua sendo aplicada pelo PostgREST/autorização do servidor.
 * Os filtros finos são aplicados no cliente (ver utilitarios/relatorios.ts),
 * o que torna a troca de filtros instantânea.
 */
export function useRelatorioChamados(workspaceId: string | undefined, inicio: Date, fim: Date) {
  const a = inicio.toISOString();
  const b = fim.toISOString();
  return useQuery({
    queryKey: ["relatorio-chamados", workspaceId, a, b],
    enabled: !!workspaceId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
    queryFn: async (): Promise<ResultadoRelatorio> => {
      const janela = (campo: string) => `and(${campo}.gte.${a},${campo}.lte.${b})`;
      const ou = ["criado_em", "resolvido_em", "fechado_em", "prazo"].map(janela).join(",");

      const todos: Chamado[] = [];
      let truncado = false;
      for (let de = 0; ; de += TAMANHO_PAGINA) {
        const { data, error } = await db
          .from("chamados")
          .select(COLUNAS)
          .eq("workspace_id", workspaceId!)
          .or(ou)
          .order("criado_em", { ascending: false })
          .order("id", { ascending: true })
          .range(de, de + TAMANHO_PAGINA - 1);
        if (error) throw error;
        const lote = (data ?? []) as unknown as Chamado[];
        todos.push(...lote);
        if (lote.length < TAMANHO_PAGINA) break;
        if (todos.length >= LIMITE_RELATORIO) {
          truncado = true;
          break;
        }
      }
      return { chamados: todos, truncado };
    },
  });
}
