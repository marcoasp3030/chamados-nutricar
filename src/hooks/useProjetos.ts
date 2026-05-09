import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProjetoComResumo, TarefaComPessoa } from "@/tipos/projeto";

async function buscarPerfis(ids: string[]) {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map<string, { id: string; nome: string }>();
  const { data } = await supabase.from("perfis").select("id, nome").in("id", unicos);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export function useProjetos(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["projetos", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<ProjetoComResumo[]> => {
      const { data, error } = await supabase
        .from("projetos")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;

      const projetos = data ?? [];
      const ids = projetos.map((p) => p.id);

      // Resumos de tarefas por projeto
      const resumos = new Map<string, { total: number; concluidas: number }>();
      if (ids.length > 0) {
        const { data: tarefas } = await supabase
          .from("tarefas")
          .select("projeto_id, status")
          .in("projeto_id", ids);
        for (const t of tarefas ?? []) {
          const r = resumos.get(t.projeto_id) ?? { total: 0, concluidas: 0 };
          r.total++;
          if (t.status === "Concluido") r.concluidas++;
          resumos.set(t.projeto_id, r);
        }
      }

      const perfis = await buscarPerfis(projetos.map((p) => p.responsavel_id ?? "").filter(Boolean));

      return projetos.map((p) => ({
        ...(p as any),
        responsavel: p.responsavel_id ? perfis.get(p.responsavel_id) ?? null : null,
        total_tarefas: resumos.get(p.id)?.total ?? 0,
        tarefas_concluidas: resumos.get(p.id)?.concluidas ?? 0,
      }));
    },
  });
}

export function useProjeto(projetoId: string | undefined) {
  return useQuery({
    queryKey: ["projeto", projetoId],
    enabled: !!projetoId,
    queryFn: async (): Promise<ProjetoComResumo | null> => {
      const { data, error } = await supabase
        .from("projetos")
        .select("*")
        .eq("id", projetoId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const perfis = await buscarPerfis([data.responsavel_id ?? ""]);
      return {
        ...(data as any),
        responsavel: data.responsavel_id ? perfis.get(data.responsavel_id) ?? null : null,
      };
    },
  });
}

export function useTarefasProjeto(projetoId: string | undefined) {
  return useQuery({
    queryKey: ["tarefas", projetoId],
    enabled: !!projetoId,
    queryFn: async (): Promise<TarefaComPessoa[]> => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .eq("projeto_id", projetoId!)
        .order("ordem", { ascending: true })
        .order("criado_em", { ascending: true });
      if (error) throw error;
      const perfis = await buscarPerfis((data ?? []).map((t) => t.responsavel_id ?? "").filter(Boolean));
      return (data ?? []).map((t) => ({
        ...(t as any),
        responsavel: t.responsavel_id ? perfis.get(t.responsavel_id) ?? null : null,
      }));
    },
  });
}
