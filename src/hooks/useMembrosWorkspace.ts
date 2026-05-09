import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MembroWorkspace {
  id: string;
  usuario_id: string;
  papel: string;
  cargo: string | null;
  departamento_id: string | null;
  departamento_ids: string[];
  perfil: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    avatar_url: string | null;
  };
}

export function useMembrosWorkspace(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["membros-workspace", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<MembroWorkspace[]> => {
      const { data: membros, error } = await supabase
        .from("workspace_membros")
        .select("id, usuario_id, papel, cargo, departamento_id")
        .eq("workspace_id", workspaceId!)
        .eq("ativo", true);

      if (error) throw error;

      const ids = (membros ?? []).map((m) => m.usuario_id);
      if (ids.length === 0) return [];

      const { data: perfis, error: erroPerfis } = await supabase
        .from("perfis")
        .select("id, nome, email, telefone, avatar_url")
        .in("id", ids);

      if (erroPerfis) throw erroPerfis;

      const mapa = new Map((perfis ?? []).map((p) => [p.id, p]));
      return (membros ?? []).map((m) => ({
        id: m.id,
        usuario_id: m.usuario_id,
        papel: m.papel,
        cargo: m.cargo,
        departamento_id: m.departamento_id,
        perfil: mapa.get(m.usuario_id) ?? {
          id: m.usuario_id,
          nome: "Usuário",
          email: "",
          telefone: null,
          avatar_url: null,
        },
      }));
    },
  });
}
