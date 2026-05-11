import { useQuery } from "@tanstack/react-query";
import type {
  ChamadoComPessoas,
  ComentarioChamado,
  HistoricoChamado,
} from "@/tipos/chamado";
import { dados } from "@/dados/atual";

async function carregarPerfis(ids: string[]) {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map<string, { id: string; nome: string; email: string }>();
  const { data } = await dados.from("perfis").select("id, nome, email").in("id", unicos);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export function useChamadoPorNumero(workspaceId: string | undefined, numero: number) {
  return useQuery({
    queryKey: ["chamado", workspaceId, numero],
    enabled: !!workspaceId && Number.isFinite(numero),
    queryFn: async (): Promise<ChamadoComPessoas | null> => {
      const { data, error } = await supabase
        .from("chamados")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("numero", numero)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const perfis = await carregarPerfis([data.solicitante_id, data.responsavel_id ?? ""]);
      return {
        ...(data as any),
        solicitante: perfis.get(data.solicitante_id) ?? null,
        responsavel: data.responsavel_id ? perfis.get(data.responsavel_id) ?? null : null,
      };
    },
  });
}

export function useSubchamados(chamadoPaiId: string | undefined) {
  return useQuery({
    queryKey: ["subchamados", chamadoPaiId],
    enabled: !!chamadoPaiId,
    queryFn: async (): Promise<ChamadoComPessoas[]> => {
      const { data, error } = await supabase
        .from("chamados")
        .select("*")
        .eq("chamado_pai_id", chamadoPaiId!)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      const ids: string[] = [];
      (data ?? []).forEach((c) => {
        ids.push(c.solicitante_id);
        if (c.responsavel_id) ids.push(c.responsavel_id);
      });
      const perfis = await carregarPerfis(ids);
      return (data ?? []).map((c) => ({
        ...(c as any),
        solicitante: perfis.get(c.solicitante_id) ?? null,
        responsavel: c.responsavel_id ? perfis.get(c.responsavel_id) ?? null : null,
      }));
    },
  });
}

export function useComentariosChamado(chamadoId: string | undefined) {
  return useQuery({
    queryKey: ["comentarios", chamadoId],
    enabled: !!chamadoId,
    queryFn: async (): Promise<ComentarioChamado[]> => {
      const { data, error } = await supabase
        .from("chamado_comentarios")
        .select("*")
        .eq("chamado_id", chamadoId!)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      const perfis = await carregarPerfis((data ?? []).map((d) => d.autor_id));
      return (data ?? []).map((d) => ({ ...(d as any), autor: perfis.get(d.autor_id) ?? null }));
    },
  });
}

export function useHistoricoChamado(chamadoId: string | undefined) {
  return useQuery({
    queryKey: ["historico", chamadoId],
    enabled: !!chamadoId,
    queryFn: async (): Promise<HistoricoChamado[]> => {
      const { data, error } = await supabase
        .from("chamado_historico")
        .select("*")
        .eq("chamado_id", chamadoId!)
        .order("criado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = (data ?? []).map((d) => d.usuario_id ?? "").filter(Boolean) as string[];
      const perfis = await carregarPerfis(ids);
      return (data ?? []).map((d) => ({
        ...(d as any),
        usuario: d.usuario_id ? perfis.get(d.usuario_id) ?? null : null,
      }));
    },
  });
}
