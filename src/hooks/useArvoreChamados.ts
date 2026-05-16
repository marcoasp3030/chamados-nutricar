import { useQuery } from "@tanstack/react-query";
import type { PrioridadeChamado, StatusChamado } from "@/tipos/chamado";
import { db } from "@/dados/atual";

export interface NoArvore {
  id: string;
  numero: number;
  codigo: string | null;
  titulo: string;
  status: StatusChamado;
  prioridade: PrioridadeChamado;
  criado_em: string;
  responsavel_id: string | null;
  responsavel_nome?: string | null;
  filhos: NoArvore[];
}

export interface ArvoreChamados {
  pais: NoArvore[];
  totalPais: number;
}

/**
 * Retorna apenas chamados-pai que possuem subchamados,
 * já com a lista de filhos aninhada. Ordenado pelos mais recentes.
 */
export function useArvoreChamados(workspaceId: string | undefined, limite = 8) {
  return useQuery({
    queryKey: ["arvore-chamados", workspaceId, limite],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async (): Promise<ArvoreChamados> => {
      const { data, error } = await db
        .from("chamados")
        .select(
          "id, numero, codigo, titulo, status, prioridade, criado_em, responsavel_id, chamado_pai_id",
        )
        .eq("workspace_id", workspaceId!)
        .order("criado_em", { ascending: false })
        .limit(1000);
      if (error) throw error;

      const todos = (data ?? []) as Array<{
        id: string;
        numero: number;
        codigo: string | null;
        titulo: string;
        status: StatusChamado;
        prioridade: PrioridadeChamado;
        criado_em: string;
        responsavel_id: string | null;
        chamado_pai_id: string | null;
      }>;

      const porPai = new Map<string, typeof todos>();
      for (const c of todos) {
        if (c.chamado_pai_id) {
          const arr = porPai.get(c.chamado_pai_id) ?? [];
          arr.push(c);
          porPai.set(c.chamado_pai_id, arr);
        }
      }

      // Apenas pais (sem pai) que possuem filhos.
      const paisComFilhos = todos.filter(
        (c) => !c.chamado_pai_id && porPai.has(c.id),
      );

      const respIds = new Set<string>();
      for (const c of todos) if (c.responsavel_id) respIds.add(c.responsavel_id);

      let nomeResp = new Map<string, string>();
      if (respIds.size > 0) {
        const { data: perfis } = await db
          .from("perfis")
          .select("id, nome")
          .in("id", [...respIds]);
        nomeResp = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
      }

      const mapear = (c: (typeof todos)[number]): NoArvore => ({
        id: c.id,
        numero: c.numero,
        codigo: c.codigo,
        titulo: c.titulo,
        status: c.status,
        prioridade: c.prioridade,
        criado_em: c.criado_em,
        responsavel_id: c.responsavel_id,
        responsavel_nome: c.responsavel_id ? nomeResp.get(c.responsavel_id) ?? null : null,
        filhos: (porPai.get(c.id) ?? [])
          .sort((a, b) => +new Date(a.criado_em) - +new Date(b.criado_em))
          .map(mapear),
      });

      const pais = paisComFilhos.slice(0, limite).map(mapear);
      return { pais, totalPais: paisComFilhos.length };
    },
  });
}
