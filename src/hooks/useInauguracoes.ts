import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ColunaInauguracao =
  | "Planejamento"
  | "Agendado"
  | "Proximas"
  | "Atrasadas"
  | "Inauguradas";

export type TipoCondominio = "Residencial" | "Corporativo" | "Evento" | null;

export interface CardInauguracao {
  id: string;
  nome: string;
  razaoSocial: string | null;
  dataInauguracao: Date | null;
  status: string;
  responsavelTecnico: string | null;
  cidadeEstado: string | null;
  tipoCondominio: TipoCondominio;
  pct: number;
  preenchidos: number;
  total: number;
  diasRestantes: number | null;
  coluna: ColunaInauguracao;
  atualizado_em: string;
}

const ROTULOS_DESTAQUE = [
  "Razão social",
  "Data prevista da inauguração",
  "Cidade / Estado",
  "Responsável técnico",
  "Tipo de condomínio",
];

export function useInauguracoes(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["inauguracoes", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<CardInauguracao[]> => {
      const { data: checklists, error } = await supabase
        .from("checklists")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      const lista = checklists ?? [];
      if (lista.length === 0) return [];

      const checklistIds = lista.map((c) => c.id);
      const templateIds = Array.from(new Set(lista.map((c) => c.template_id)));

      const [{ data: itens }, { data: respostas }] = await Promise.all([
        supabase
          .from("checklist_template_itens")
          .select("id, template_id, rotulo")
          .in("template_id", templateIds),
        supabase
          .from("checklist_respostas")
          .select("checklist_id, item_id, valor")
          .in("checklist_id", checklistIds),
      ]);

      // total de itens ativos por template (para %)
      const { data: itensAtivos } = await supabase
        .from("checklist_template_itens")
        .select("template_id, id")
        .in("template_id", templateIds)
        .eq("ativo", true);

      const totalPorTemplate = new Map<string, number>();
      for (const it of itensAtivos ?? []) {
        totalPorTemplate.set(it.template_id, (totalPorTemplate.get(it.template_id) ?? 0) + 1);
      }

      // mapa item_id -> rotulo (apenas destaques) e item_id -> template_id
      const itemDestaque = new Map<string, string>();
      for (const it of itens ?? []) {
        if (ROTULOS_DESTAQUE.includes(it.rotulo)) {
          itemDestaque.set(it.id, it.rotulo);
        }
      }

      // contagem de respostas preenchidas por checklist e valores destaque
      const preenchPorChecklist = new Map<string, number>();
      const destaquePorChecklist = new Map<string, Record<string, unknown>>();
      for (const r of respostas ?? []) {
        const v = (r.valor as { v?: unknown } | null)?.v;
        if (v !== null && v !== undefined && v !== "" && v !== false) {
          preenchPorChecklist.set(
            r.checklist_id,
            (preenchPorChecklist.get(r.checklist_id) ?? 0) + 1,
          );
        }
        const rotulo = itemDestaque.get(r.item_id);
        if (rotulo) {
          if (!destaquePorChecklist.has(r.checklist_id)) {
            destaquePorChecklist.set(r.checklist_id, {});
          }
          destaquePorChecklist.get(r.checklist_id)![rotulo] = v;
        }
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      return lista.map<CardInauguracao>((c) => {
        const destaques = destaquePorChecklist.get(c.id) ?? {};
        const total = totalPorTemplate.get(c.template_id) ?? 0;
        const preenchidos = preenchPorChecklist.get(c.id) ?? 0;
        const pct = total > 0 ? Math.round((preenchidos / total) * 100) : 0;

        const dataStr = destaques["Data prevista da inauguração"] as string | undefined;
        let data: Date | null = null;
        if (dataStr && typeof dataStr === "string") {
          const d = new Date(dataStr + "T00:00:00");
          if (!isNaN(d.getTime())) data = d;
        }

        const diasRestantes =
          data != null
            ? Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        let coluna: ColunaInauguracao;
        if (c.status === "Concluído" || c.status === "Concluido") {
          coluna = "Inauguradas";
        } else if (data == null) {
          coluna = "Planejamento";
        } else if (diasRestantes! < 0) {
          coluna = "Atrasadas";
        } else if (diasRestantes! <= 30) {
          coluna = "Proximas";
        } else {
          coluna = "Agendado";
        }

        const razao = (destaques["Razão social"] as string | undefined) ?? null;
        const tipoRaw = destaques["Tipo de condomínio"] as string | undefined;
        const tipoCondominio: TipoCondominio =
          tipoRaw === "Residencial" || tipoRaw === "Corporativo" || tipoRaw === "Evento"
            ? tipoRaw
            : null;

        return {
          id: c.id,
          nome: c.nome,
          razaoSocial: razao && razao.trim() !== "" ? razao : null,
          dataInauguracao: data,
          status: c.status,
          responsavelTecnico:
            (destaques["Responsável técnico"] as string | undefined) ?? null,
          cidadeEstado: (destaques["Cidade / Estado"] as string | undefined) ?? null,
          tipoCondominio,
          pct,
          preenchidos,
          total,
          diasRestantes,
          coluna,
          atualizado_em: c.atualizado_em,
        };
      });
    },
  });
}
