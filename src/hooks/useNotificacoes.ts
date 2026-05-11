import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Canais, useInscricaoRealtime } from "@/realtime/atual";
import { dados } from "@/dados/atual";

export interface Notificacao {
  id: string;
  workspace_id: string;
  destinatario_id: string;
  ator_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  recurso_tipo: string | null;
  recurso_id: string | null;
  lida_em: string | null;
  criado_em: string;
}

export function useNotificacoes(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notificacoes", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Notificacao[]> => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("criado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notificacao[];
    },
  });

  useInscricaoRealtime(
    workspaceId ? Canais.notificacoes(workspaceId) : null,
    () => qc.invalidateQueries({ queryKey: ["notificacoes", workspaceId] }),
    [workspaceId, qc],
  );

  return query;
}

export function useMarcarNotificacaoLida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[] | "todas") => {
      let q = dados.from("notificacoes").update({ lida_em: new Date().toISOString() });
      if (ids === "todas") q = q.is("lida_em", null);
      else q = q.in("id", ids);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });
}
