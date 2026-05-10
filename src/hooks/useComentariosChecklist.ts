import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ComentarioChecklist {
  id: string;
  checklist_id: string;
  workspace_id: string;
  autor_id: string;
  autor_nome: string;
  conteudo: string;
  criado_em: string;
  atualizado_em: string;
}

export function useComentariosChecklist(checklistId: string | undefined) {
  return useQuery({
    queryKey: ["checklist-comentarios", checklistId],
    enabled: !!checklistId,
    queryFn: async (): Promise<ComentarioChecklist[]> => {
      const { data, error } = await supabase
        .from("checklist_comentarios")
        .select("*")
        .eq("checklist_id", checklistId!)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      const lista = data ?? [];
      const ids = Array.from(new Set(lista.map((c) => c.autor_id)));
      const nomes = new Map<string, string>();
      if (ids.length > 0) {
        const { data: perfis } = await supabase
          .from("perfis")
          .select("id, nome")
          .in("id", ids);
        for (const p of perfis ?? []) nomes.set(p.id, p.nome);
      }
      return lista.map((c) => ({
        ...c,
        autor_nome: nomes.get(c.autor_id) ?? "Usuário",
      })) as ComentarioChecklist[];
    },
  });
}

export function useContagemComentarios(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["checklist-comentarios-contagem", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from("checklist_comentarios")
        .select("checklist_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of data ?? []) {
        m.set(r.checklist_id, (m.get(r.checklist_id) ?? 0) + 1);
      }
      return m;
    },
  });
}

export function useAdicionarComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      checklistId: string;
      workspaceId: string;
      conteudo: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const { error } = await supabase.from("checklist_comentarios").insert({
        checklist_id: vars.checklistId,
        workspace_id: vars.workspaceId,
        autor_id: u.user.id,
        conteudo: vars.conteudo.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["checklist-comentarios", v.checklistId] });
      qc.invalidateQueries({ queryKey: ["checklist-comentarios-contagem"] });
    },
  });
}

export function useExcluirComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checklist_comentarios")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist-comentarios"] });
      qc.invalidateQueries({ queryKey: ["checklist-comentarios-contagem"] });
    },
  });
}
