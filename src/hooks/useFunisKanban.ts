import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/dados/atual";
import { STATUS_KANBAN, type StatusChamado, type PrioridadeChamado } from "@/tipos/chamado";
import { rotuloStatusChamado } from "@/utilitarios/traducoes";

export type TipoFunil = "status" | "filtro";

export interface FiltrosFunil {
  prioridades?: PrioridadeChamado[];
  lojas?: string[];
  tags?: string[];
  departamento_ids?: string[];
  categorias?: string[];
}

export interface FunilKanban {
  id: string;
  workspace_id: string;
  usuario_id: string;
  nome: string;
  cor: string;
  ordem: number;
  tipo: TipoFunil;
  status_origem: StatusChamado | null;
  filtros: FiltrosFunil;
  criado_em: string;
  atualizado_em: string;
}

const CORES_PADRAO: Record<StatusChamado, string> = {
  Aberto: "#3b82f6",
  "Em andamento": "#f59e0b",
  Agendado: "#6366f1",
  Pausado: "#eab308",
  "Aguardando solicitante": "#a855f7",
  "Aguardando terceiros": "#ec4899",
  Resolvido: "#10b981",
  Fechado: "#64748b",
  Cancelado: "#ef4444",
};

export function useFunisKanban(workspaceId: string | undefined, usuarioId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["kanban_funis", workspaceId, usuarioId],
    enabled: !!workspaceId && !!usuarioId,
    queryFn: async (): Promise<FunilKanban[]> => {
      const { data, error } = await db
        .from("kanban_funis")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("usuario_id", usuarioId!)
        .order("ordem", { ascending: true });
      if (error) throw error;

      if (!data || data.length === 0) {
        // Sementeira: cria funis padrão a partir do STATUS_KANBAN
        const seed = STATUS_KANBAN.map((s, i) => ({
          workspace_id: workspaceId!,
          usuario_id: usuarioId!,
          nome: rotuloStatusChamado[s],
          cor: CORES_PADRAO[s],
          ordem: i,
          tipo: "status" as const,
          status_origem: s,
          filtros: {},
        }));
        const { data: novos, error: errIns } = await db
          .from("kanban_funis")
          .insert(seed)
          .select("*");
        if (errIns) throw errIns;
        return (novos ?? []) as FunilKanban[];
      }
      return data as FunilKanban[];
    },
  });

  const salvar = useMutation({
    mutationFn: async (
      f: Partial<FunilKanban> & {
        workspace_id: string;
        usuario_id: string;
        nome: string;
        tipo: TipoFunil;
      },
    ) => {
      if (f.id) {
        const { error } = await db
          .from("kanban_funis")
          .update({
            nome: f.nome,
            cor: f.cor,
            ordem: f.ordem,
            tipo: f.tipo,
            status_origem: f.status_origem ?? null,
            filtros: f.filtros ?? {},
          })
          .eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("kanban_funis").insert({
          workspace_id: f.workspace_id,
          usuario_id: f.usuario_id,
          nome: f.nome,
          cor: f.cor ?? "#64748b",
          ordem: f.ordem ?? 999,
          tipo: f.tipo,
          status_origem: f.status_origem ?? null,
          filtros: f.filtros ?? {},
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kanban_funis"] }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("kanban_funis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kanban_funis"] }),
  });

  const reordenar = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id, ordem) =>
          db.from("kanban_funis").update({ ordem }).eq("id", id),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kanban_funis"] }),
  });

  return { ...query, salvar, excluir, reordenar };
}

export function chamadoAtendeFunil(
  c: { status: StatusChamado; prioridade: PrioridadeChamado; loja: string | null; tags: string[]; departamento_id: string | null; categoria: string | null },
  funil: FunilKanban,
): boolean {
  if (funil.tipo === "status") {
    return funil.status_origem === c.status;
  }
  const f = funil.filtros ?? {};
  if (f.prioridades?.length && !f.prioridades.includes(c.prioridade)) return false;
  if (f.lojas?.length && (!c.loja || !f.lojas.includes(c.loja))) return false;
  if (f.departamento_ids?.length && (!c.departamento_id || !f.departamento_ids.includes(c.departamento_id))) return false;
  if (f.categorias?.length && (!c.categoria || !f.categorias.includes(c.categoria))) return false;
  if (f.tags?.length && !f.tags.some((t) => c.tags.includes(t))) return false;
  return true;
}
