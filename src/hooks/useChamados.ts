import { useQuery } from "@tanstack/react-query";
import type { ChamadoComPessoas, StatusChamado, PrioridadeChamado } from "@/tipos/chamado";
import { obterUsuarioAtual } from "@/auth/atual";
import { db } from "@/dados/atual";
import { fecharChamadosResolvidosExpirados } from "@/lib/chamados-manutencao";

export interface FiltrosChamados {
  status?: StatusChamado | "Todos";
  prioridade?: PrioridadeChamado | "Todas";
  busca?: string;
  responsavel_id?: string | "Todos" | "MEUS";
  categoria?: string | "Todas";
  departamento_id?: string | "Todos";
  solicitante_id?: string | "Todos" | "MEUS";
  /** true = oculta subchamados; false (padrão na lista) = inclui subchamados. */
  somenteRaiz?: boolean;
  dataInicio?: string; // ISO
  dataFim?: string; // ISO
  campoData?: "criado_em" | "atualizado_em" | "prazo" | "fechado_em" | "resolvido_em";
  /** Vários status (ex.: Aguardando solicitante + Aguardando terceiros). */
  statusIn?: StatusChamado[];
  /** Filtro do flag proposta_criada (categorias de projeto encerradas). */
  propostaCriada?: "todos" | "com" | "sem";
}

/** Query estável para o quadro Kanban (compartilha cache entre Lista → Quadro). */
export const CHAMADOS_QUADRO_QUERY_KEY = "quadro" as const;

async function buscarChamadosComPerfis(
  workspaceId: string,
  filtros: FiltrosChamados,
  executarManutencao: boolean,
): Promise<ChamadoComPessoas[]> {
  if (executarManutencao) {
    await fecharChamadosResolvidosExpirados(workspaceId);
  }

  let q = db
    .from("chamados")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("criado_em", { ascending: false })
    .limit(500);

  if (filtros.statusIn && filtros.statusIn.length > 0) {
    q = q.in("status", filtros.statusIn);
  } else if (filtros.status && filtros.status !== "Todos") {
    q = q.eq("status", filtros.status);
  }
  if (filtros.prioridade && filtros.prioridade !== "Todas")
    q = q.eq("prioridade", filtros.prioridade);
  if (filtros.categoria && filtros.categoria !== "Todas")
    q = q.eq("categoria", filtros.categoria);
  if (filtros.departamento_id && filtros.departamento_id !== "Todos")
    q = q.or(
      `departamento_id.eq.${filtros.departamento_id},departamento_origem_id.eq.${filtros.departamento_id}`,
    );
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

  if (filtros.solicitante_id && filtros.solicitante_id !== "Todos") {
    if (filtros.solicitante_id === "MEUS") {
      const u = { user: await obterUsuarioAtual() };
      if (u.user) q = q.eq("solicitante_id", u.user.id);
    } else {
      q = q.eq("solicitante_id", filtros.solicitante_id);
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
}

async function buscarPerfisPorIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; nome: string; email: string }>();
  const { data } = await db
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
    queryFn: () => buscarChamadosComPerfis(workspaceId!, filtros, true),
  });
}

/** Chamados raiz para o quadro Kanban — cache dedicado e reutilizável. */
export function useChamadosQuadro(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["chamados", workspaceId, CHAMADOS_QUADRO_QUERY_KEY],
    enabled: !!workspaceId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: () =>
      buscarChamadosComPerfis(workspaceId!, { somenteRaiz: true }, false),
  });
}

export async function prefetchChamadosQuadro(
  queryClient: import("@tanstack/react-query").QueryClient,
  workspaceId: string,
) {
  await queryClient.prefetchQuery({
    queryKey: ["chamados", workspaceId, CHAMADOS_QUADRO_QUERY_KEY],
    staleTime: 30_000,
    queryFn: () =>
      buscarChamadosComPerfis(workspaceId, { somenteRaiz: true }, false),
  });
}
