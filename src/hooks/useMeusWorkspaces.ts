import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkspaceComPapel, PapelMembro } from "@/tipos/workspace";
import { obterSessao } from "@/auth/atual";

interface LinhaMembro {
  papel: PapelMembro;
  workspace: WorkspaceComPapel | null;
}

export function useMeusWorkspaces() {
  return useQuery({
    queryKey: ["meus-workspaces"],
    queryFn: async (): Promise<WorkspaceComPapel[]> => {
      const sessao = await obterSessao().then((s) => ({ session: s.usuario ? { user: s.usuario } : null }));
      if (!sessao.session) return [];

      const { data, error } = await supabase
        .from("workspace_membros")
        .select("papel, workspace:workspaces(*)")
        .eq("usuario_id", sessao.session.user.id)
        .eq("ativo", true);

      if (error) throw error;

      return (data as unknown as LinhaMembro[])
        .filter((linha) => linha.workspace !== null)
        .map((linha) => ({ ...(linha.workspace as WorkspaceComPapel), papel: linha.papel }));
    },
  });
}
