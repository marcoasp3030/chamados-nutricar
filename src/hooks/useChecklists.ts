import { useQuery } from "@tanstack/react-query";
import { db } from "@/dados/atual";

export type TipoItemChecklist =
  | "checkbox"
  | "texto"
  | "textarea"
  | "sim_nao"
  | "select"
  | "data"
  | "numero";

export interface ChecklistTemplate {
  id: string;
  workspace_id: string;
  nome: string;
  descricao: string | null;
  padrao: boolean;
  criado_em: string;
}

export interface ItemTemplate {
  id: string;
  template_id: string;
  workspace_id: string;
  secao: string;
  subsecao: string | null;
  rotulo: string;
  tipo: TipoItemChecklist;
  opcoes: string[] | null;
  ordem: number;
  ativo: boolean;
}

export interface Checklist {
  id: string;
  workspace_id: string;
  template_id: string;
  nome: string;
  status: string;
  responsavel_id: string | null;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
  total_itens?: number;
  itens_preenchidos?: number;
}

export interface RespostaChecklist {
  id: string;
  checklist_id: string;
  item_id: string;
  valor: unknown;
  atualizado_em: string;
  atualizado_por: string | null;
}

export function useChecklistTemplates(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["checklist-templates", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<ChecklistTemplate[]> => {
      const { data, error } = await db
        .from("checklist_templates")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("padrao", { ascending: false })
        .order("nome");
      if (error) throw error;
      return data as ChecklistTemplate[];
    },
  });
}

export function useItensTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ["checklist-itens-template", templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<ItemTemplate[]> => {
      const { data, error } = await db
        .from("checklist_template_itens")
        .select("*")
        .eq("template_id", templateId!)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as ItemTemplate[];
    },
  });
}

export function useChecklists(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["checklists", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Checklist[]> => {
      const { data, error } = await db
        .from("checklists")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Checklist[];
    },
  });
}

export function useChecklist(checklistId: string | undefined) {
  return useQuery({
    queryKey: ["checklist", checklistId],
    enabled: !!checklistId,
    queryFn: async () => {
      const { data, error } = await db
        .from("checklists")
        .select("*")
        .eq("id", checklistId!)
        .maybeSingle();
      if (error) throw error;
      return data as Checklist | null;
    },
  });
}

export function useRespostasChecklist(checklistId: string | undefined) {
  return useQuery({
    queryKey: ["checklist-respostas", checklistId],
    enabled: !!checklistId,
    queryFn: async (): Promise<RespostaChecklist[]> => {
      const { data, error } = await db
        .from("checklist_respostas")
        .select("*")
        .eq("checklist_id", checklistId!);
      if (error) throw error;
      return (data ?? []) as RespostaChecklist[];
    },
  });
}

export function useHistoricoChecklist(checklistId: string | undefined) {
  return useQuery({
    queryKey: ["checklist-historico", checklistId],
    enabled: !!checklistId,
    queryFn: async () => {
      const { data, error } = await db
        .from("checklist_historico")
        .select("*")
        .eq("checklist_id", checklistId!)
        .order("criado_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      const usuarios = Array.from(new Set((data ?? []).map((h) => h.usuario_id).filter(Boolean))) as string[];
      const mapaNomes = new Map<string, string>();
      if (usuarios.length > 0) {
        const { data: perfis } = await db.from("perfis").select("id, nome").in("id", usuarios);
        for (const p of perfis ?? []) mapaNomes.set(p.id, p.nome);
      }
      return (data ?? []).map((h) => ({ ...h, usuario_nome: h.usuario_id ? mapaNomes.get(h.usuario_id) ?? "Usuário" : "Sistema" }));
    },
  });
}
