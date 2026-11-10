import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/dados/atual";
import { useUsuarioAtualId } from "@/auth/atual";

export type ChaveColuna =
  | "Planejamento"
  | "Agendado"
  | "Proximas"
  | "Atrasadas"
  | "Inauguradas";

export interface FunilInauguracao {
  id: string;
  workspace_id: string;
  chave: ChaveColuna | string;
  rotulo: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export const FUNIS_PADRAO: Array<Omit<FunilInauguracao, "id" | "workspace_id">> = [
  { chave: "Planejamento", rotulo: "Planejamento", descricao: "Sem data prevista", ordem: 0, ativo: true },
  { chave: "Agendado", rotulo: "Agendado", descricao: "Mais de 30 dias", ordem: 1, ativo: true },
  { chave: "Proximas", rotulo: "Standby", descricao: "Nos próximos 30 dias", ordem: 2, ativo: true },
  { chave: "Atrasadas", rotulo: "Atrasadas", descricao: "Data já passou", ordem: 3, ativo: true },
  { chave: "Inauguradas", rotulo: "Concluído", descricao: "Concluídas", ordem: 4, ativo: true },
];

export function useEhSuperAdmin() {
  const id = useUsuarioAtualId();
  return useQuery({
    queryKey: ["super-admin", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await db.from("perfis").select("super_admin").eq("id", id!).maybeSingle();
      return !!data?.super_admin;
    },
  });
}

export function useFunisInauguracao(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["funis-inauguracao", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<FunilInauguracao[]> => {
      const { data, error } = await db
        .from("inauguracao_funis")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as FunilInauguracao[];
    },
  });

  // Auto-seed padrão se vazio (qualquer usuário tenta; falha silenciosa se não for super admin)
  useEffect(() => {
    if (!workspaceId || query.isLoading || !query.data) return;
    if (query.data.length > 0) return;
    db.from("inauguracao_funis")
      .insert(FUNIS_PADRAO.map((f) => ({ ...f, workspace_id: workspaceId })))
      .then(() => qc.invalidateQueries({ queryKey: ["funis-inauguracao", workspaceId] }));
  }, [workspaceId, query.data, query.isLoading, qc]);

  const salvar = useMutation({
    mutationFn: async (f: Partial<FunilInauguracao> & { id?: string }) => {
      if (f.id) {
        const { error } = await db
          .from("inauguracao_funis")
          .update({ rotulo: f.rotulo, descricao: f.descricao ?? null, ativo: f.ativo, ordem: f.ordem })
          .eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("inauguracao_funis").insert({
          workspace_id: workspaceId!,
          chave: f.chave!,
          rotulo: f.rotulo!,
          descricao: f.descricao ?? null,
          ordem: f.ordem ?? 0,
          ativo: f.ativo ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funis-inauguracao", workspaceId] }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("inauguracao_funis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funis-inauguracao", workspaceId] }),
  });

  return { ...query, salvar, excluir };
}
