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
  topLojas: RankingItem[];
  topDepartamentos: RankingItem[];
  topCategorias: RankingItem[];
  topResponsaveis: RankingItem[];
}

export interface RankingItem {
  chave: string;
  rotulo: string;
  total: number;
  ativos: number;
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
        .select("id, numero, codigo, titulo, status, prioridade, prazo, criado_em, resolvido_em, fechado_em, responsavel_id, loja, categoria, departamento_id")
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

      const acumLoja = new Map<string, { total: number; ativos: number }>();
      const acumDep = new Map<string, { total: number; ativos: number }>();
      const acumCat = new Map<string, { total: number; ativos: number }>();
      const acumResp = new Map<string, { total: number; ativos: number }>();

      const addAcum = (
        mapa: Map<string, { total: number; ativos: number }>,
        chave: string | null | undefined,
        ativo: boolean,
      ) => {
        const k = chave && String(chave).trim() ? String(chave) : "__sem__";
        const cur = mapa.get(k) ?? { total: 0, ativos: 0 };
        cur.total++;
        if (ativo) cur.ativos++;
        mapa.set(k, cur);
      };

      for (const c of lista) {
        porStatus[c.status as StatusChamado] = (porStatus[c.status as StatusChamado] ?? 0) + 1;
        porPrioridade[c.prioridade as PrioridadeChamado] =
          (porPrioridade[c.prioridade as PrioridadeChamado] ?? 0) + 1;

        const ativo = c.status !== "Fechado" && c.status !== "Cancelado" && c.status !== "Resolvido";
        if (c.status === "Aberto") abertos++;
        if (c.status === "Em andamento") emAndamento++;
        if (c.status === "Aguardando solicitante" || c.status === "Aguardando terceiros") aguardando++;

        if (ativo && c.prazo && new Date(c.prazo) < agora) vencidos++;
        if (meuId && c.responsavel_id === meuId && ativo) meusAtribuidos++;

        const criado = new Date(c.criado_em);
        if (criado >= inicioMes) totalMes++;
        if (c.resolvido_em && new Date(c.resolvido_em) >= inicioMes) resolvidosMes++;
        if (c.fechado_em && new Date(c.fechado_em) >= inicioMes) fechadosMes++;

        addAcum(acumLoja, (c as { loja?: string | null }).loja, ativo);
        addAcum(acumDep, (c as { departamento_id?: string | null }).departamento_id, ativo);
        addAcum(acumCat, (c as { categoria?: string | null }).categoria, ativo);
        addAcum(acumResp, c.responsavel_id, ativo);
      }

      const depIds = Array.from(acumDep.keys()).filter((k) => k !== "__sem__");
      const respIds = Array.from(acumResp.keys()).filter((k) => k !== "__sem__");

      const [depRes, perfRes] = await Promise.all([
        depIds.length
          ? supabase.from("departamentos").select("id, nome").in("id", depIds)
          : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
        respIds.length
          ? supabase.from("perfis").select("id, nome").in("id", respIds)
          : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
      ]);

      const nomeDep = new Map<string, string>();
      (depRes.data ?? []).forEach((d) => nomeDep.set(d.id, d.nome));
      const nomeResp = new Map<string, string>();
      (perfRes.data ?? []).forEach((p) => nomeResp.set(p.id, p.nome));

      const construirRanking = (
        mapa: Map<string, { total: number; ativos: number }>,
        resolverNome: (k: string) => string,
      ): RankingItem[] =>
        Array.from(mapa.entries())
          .map(([chave, v]) => ({
            chave,
            rotulo: chave === "__sem__" ? "Sem definição" : resolverNome(chave),
            total: v.total,
            ativos: v.ativos,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

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
        topLojas: construirRanking(acumLoja, (k) => k),
        topDepartamentos: construirRanking(acumDep, (k) => nomeDep.get(k) ?? "—"),
        topCategorias: construirRanking(acumCat, (k) => k),
        topResponsaveis: construirRanking(acumResp, (k) => nomeResp.get(k) ?? "—"),
      };
    },
  });
}
