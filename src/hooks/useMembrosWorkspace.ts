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

      const membroIds = (membros ?? []).map((m) => m.id);

      const [perfisRes, vinculosRes] = await Promise.all([
        supabase.from("perfis").select("id, nome, email, telefone, avatar_url").in("id", ids),
        supabase
          .from("workspace_membro_departamentos")
          .select("membro_id, departamento_id")
          .in("membro_id", membroIds),
      ]);

      if (perfisRes.error) throw perfisRes.error;
      if (vinculosRes.error) throw vinculosRes.error;

      const mapa = new Map((perfisRes.data ?? []).map((p) => [p.id, p]));
      const mapaDeptos = new Map<string, string[]>();
      for (const v of vinculosRes.data ?? []) {
        const arr = mapaDeptos.get(v.membro_id) ?? [];
        arr.push(v.departamento_id);
        mapaDeptos.set(v.membro_id, arr);
      }

      return (membros ?? []).map((m) => ({
        id: m.id,
        usuario_id: m.usuario_id,
        papel: m.papel,
        cargo: m.cargo,
        departamento_id: m.departamento_id,
        departamento_ids: mapaDeptos.get(m.id) ?? (m.departamento_id ? [m.departamento_id] : []),
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
