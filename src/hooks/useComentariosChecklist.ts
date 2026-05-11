import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { obterUsuarioAtual } from "@/auth/atual";

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
      mencionados?: string[];
      nomeChecklist?: string;
      destinatariosExtras?: string[];
      slugWorkspace?: string;
    }) => {
      const u = { user: await obterUsuarioAtual() };
      if (!u.user) throw new Error("Não autenticado");
      const conteudo = vars.conteudo.trim();
      const mencionados = Array.from(new Set(vars.mencionados ?? []));
      const { error } = await supabase.from("checklist_comentarios").insert({
        checklist_id: vars.checklistId,
        workspace_id: vars.workspaceId,
        autor_id: u.user!.id,
        conteudo,
        mencionados,
      });
      if (error) throw error;

      // Carregar nome do autor
      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome")
        .eq("id", u.user!.id)
        .maybeSingle();
      const autorNome = perfil?.nome ?? "Alguém";
      const titulo = vars.nomeChecklist
        ? `${autorNome} comentou em ${vars.nomeChecklist}`
        : `${autorNome} comentou em uma inauguração`;
      const link = vars.slugWorkspace
        ? `/w/${vars.slugWorkspace}/checklists/${vars.checklistId}`
        : null;

      const destinatarios = new Set<string>([
        ...mencionados,
        ...(vars.destinatariosExtras ?? []),
      ]);
      destinatarios.delete(u.user!.id);
      if (destinatarios.size > 0) {
        const linhas = Array.from(destinatarios).map((dest) => ({
          workspace_id: vars.workspaceId,
          destinatario_id: dest,
          ator_id: u.user!.id,
          tipo: mencionados.includes(dest) ? "mencao_comentario" : "novo_comentario",
          titulo: mencionados.includes(dest)
            ? `${autorNome} mencionou você`
            : titulo,
          mensagem: conteudo.slice(0, 220),
          link,
          recurso_tipo: "checklist",
          recurso_id: vars.checklistId,
        }));
        await supabase.from("notificacoes").insert(linhas);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["checklist-comentarios", v.checklistId] });
      qc.invalidateQueries({ queryKey: ["checklist-comentarios-contagem"] });
      qc.invalidateQueries({ queryKey: ["notificacoes"] });
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
