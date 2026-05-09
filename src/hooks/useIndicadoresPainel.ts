import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PrioridadeChamado, StatusChamado } from "@/tipos/chamado";

export interface IndicadoresPainel {
  abertos: number;
  emAndamento: number;
  aguardando: number;
  resolvidosMes: number;
  fechadosMes: number;
  vencidos: number;
  meusAtribuidos: number;
  totalMes: number;
  porStatus: Record<StatusChamado, number>;
  porPrioridade: Record<PrioridadeChamado, number>;
  ultimos: Array<{
    id: string;
    numero: number;
    codigo: string | null;
    titulo: string;
    status: StatusChamado;
    prioridade: PrioridadeChamado;
    criado_em: string;
  }>;
}

const STATUS_VAZIO: Record<StatusChamado, number> = {
  Aberto: 0,
  "Em andamento": 0,
  "Aguardando solicitante": 0,
  "Aguardando terceiros": 0,
  Resolvido: 0,
  Fechado: 0,
  Cancelado: 0,
};

const PRIO_VAZIO: Record<PrioridadeChamado, number> = {
  Baixa: 0,
  Media: 0,
  Alta: 0,
  Urgente: 0,
};

export function useIndicadoresPainel(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["painel", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<IndicadoresPainel> => {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { data: u } = await supabase.auth.getUser();
      const meuId = u.user?.id;

      const { data, error } = await supabase
        .from("chamados")
        .select("id, numero, codigo, titulo, status, prioridade, prazo, criado_em, resolvido_em, fechado_em, responsavel_id")
        .eq("workspace_id", workspaceId!)
        .order("criado_em", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const lista = data ?? [];
      const agora = new Date();
      const porStatus = { ...STATUS_VAZIO };
      const porPrioridade = { ...PRIO_VAZIO };

      let abertos = 0;
      let emAndamento = 0;
      let aguardando = 0;
      let resolvidosMes = 0;
      let fechadosMes = 0;
      let vencidos = 0;
      let meusAtribuidos = 0;
      let totalMes = 0;

      for (const c of lista) {
        porStatus[c.status as StatusChamado] = (porStatus[c.status as StatusChamado] ?? 0) + 1;
        porPrioridade[c.prioridade as PrioridadeChamado] =
          (porPrioridade[c.prioridade as PrioridadeChamado] ?? 0) + 1;

        const ativos = c.status !== "Fechado" && c.status !== "Cancelado" && c.status !== "Resolvido";
        if (c.status === "Aberto") abertos++;
        if (c.status === "Em andamento") emAndamento++;
        if (c.status === "Aguardando solicitante" || c.status === "Aguardando terceiros") aguardando++;

        if (ativos && c.prazo && new Date(c.prazo) < agora) vencidos++;
        if (meuId && c.responsavel_id === meuId && ativos) meusAtribuidos++;

        const criado = new Date(c.criado_em);
        if (criado >= inicioMes) totalMes++;
        if (c.resolvido_em && new Date(c.resolvido_em) >= inicioMes) resolvidosMes++;
        if (c.fechado_em && new Date(c.fechado_em) >= inicioMes) fechadosMes++;
      }

      return {
        abertos,
        emAndamento,
        aguardando,
        resolvidosMes,
        fechadosMes,
        vencidos,
        meusAtribuidos,
        totalMes,
        porStatus,
        porPrioridade,
        ultimos: lista.slice(0, 6).map((c) => ({
          id: c.id,
          numero: c.numero,
          codigo: (c as { codigo?: string | null }).codigo ?? null,
          titulo: c.titulo,
          status: c.status as StatusChamado,
          prioridade: c.prioridade as PrioridadeChamado,
          criado_em: c.criado_em,
        })),
      };
    },
  });
}
