import { useQuery } from "@tanstack/react-query";
import type { ChamadoComPessoas, StatusChamado, PrioridadeChamado } from "@/tipos/chamado";
import { obterUsuarioAtual } from "@/auth/atual";

export interface FiltrosChamados {
  status?: StatusChamado | "Todos";
  prioridade?: PrioridadeChamado | "Todas";
  busca?: string;
  responsavel_id?: string | "Todos" | "MEUS";
  somenteRaiz?: boolean;
  dataInicio?: string; // ISO
  dataFim?: string; // ISO
  campoData?: "criado_em" | "atualizado_em" | "prazo" | "fechado_em";
}

async function buscarPerfisPorIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; nome: string; email: string }>();
  const { data } = await supabase
    .from("perfis")
    .select("id, nome, email")
    .in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export function useChamados(workspaceId: string | undefined, filtros: FiltrosChamados = {}) {
  return useQuery({
    queryKey: ["chamados", workspaceId, filtros],
    enabled: !!workspaceId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<ChamadoComPessoas[]> => {
      let q = supabase
        .from("chamados")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("criado_em", { ascending: false })
        .limit(500);

      if (filtros.status && filtros.status !== "Todos") q = q.eq("status", filtros.status);
      if (filtros.prioridade && filtros.prioridade !== "Todas")
        q = q.eq("prioridade", filtros.prioridade);
      if (filtros.busca && filtros.busca.trim()) {
        const t = filtros.busca.trim();
        const numero = parseInt(t.replace(/\D/g, ""), 10);
        if (!Number.isNaN(numero)) {
          q = q.or(`titulo.ilike.%${t}%,numero.eq.${numero}`);
        } else {
          q = q.ilike("titulo", `%${t}%`);
        }
      }
      if (filtros.somenteRaiz) q = q.is("chamado_pai_id", null);
      if (filtros.responsavel_id && filtros.responsavel_id !== "Todos") {
        if (filtros.responsavel_id === "MEUS") {
          const u = { user: await obterUsuarioAtual() };
          if (u.user) q = q.eq("responsavel_id", u.user.id);
        } else {
          q = q.eq("responsavel_id", filtros.responsavel_id);
        }
      }

      const campo = filtros.campoData ?? "criado_em";
      if (filtros.dataInicio) q = q.gte(campo, filtros.dataInicio);
      if (filtros.dataFim) q = q.lte(campo, filtros.dataFim);

      const { data, error } = await q;
      if (error) throw error;

      const ids = new Set<string>();
      (data ?? []).forEach((c) => {
        if (c.solicitante_id) ids.add(c.solicitante_id);
        if (c.responsavel_id) ids.add(c.responsavel_id);
      });
      const perfis = await buscarPerfisPorIds([...ids]);

      return (data ?? []).map((c) => ({
        ...(c as any),
        solicitante: perfis.get(c.solicitante_id) ?? null,
        responsavel: c.responsavel_id ? perfis.get(c.responsavel_id) ?? null : null,
      }));
    },
  });
}
