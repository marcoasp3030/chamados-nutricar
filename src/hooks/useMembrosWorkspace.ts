import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MembroWorkspace {
  usuario_id: string;
  papel: string;
  perfil: { id: string; nome: string; email: string; avatar_url: string | null };
}

export function useMembrosWorkspace(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["membros-workspace", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<MembroWorkspace[]> => {
      const { data: membros, error } = await supabase
        .from("workspace_membros")
        .select("usuario_id, papel")
        .eq("workspace_id", workspaceId!)
        .eq("ativo", true);

      if (error) throw error;

      const ids = (membros ?? []).map((m) => m.usuario_id);
      if (ids.length === 0) return [];

      const { data: perfis, error: erroPerfis } = await supabase
        .from("perfis")
        .select("id, nome, email, avatar_url")
        .in("id", ids);

      if (erroPerfis) throw erroPerfis;

      const mapa = new Map((perfis ?? []).map((p) => [p.id, p]));
      return (membros ?? []).map((m) => ({
        usuario_id: m.usuario_id,
        papel: m.papel,
        perfil: mapa.get(m.usuario_id) ?? {
          id: m.usuario_id,
          nome: "Usuário",
          email: "",
          avatar_url: null,
        },
      }));
    },
  });
}
