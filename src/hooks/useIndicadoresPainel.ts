import { useQuery } from "@tanstack/react-query";
import type { PrioridadeChamado, StatusChamado } from "@/tipos/chamado";
import { obterUsuarioAtual } from "@/auth/atual";
import { dados } from "@/dados/atual";

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
  slaEstouradoPorDepartamento: RankingItem[];
  semInteracaoPorDepartamento: RankingItem[];
  departamentosMaisResolvem: RankingItem[];
  departamentosPiorIndiceResolucao: RankingItem[];
}

export interface RankingItem {
  chave: string;
  rotulo: string;
  total: number;
  ativos: number;
  /** IDs dos chamados que compõem este item — usado para abrir lista filtrada. */
  ids: string[];
  /** Texto secundário opcional (ex.: "32% resolvidos"). Quando presente, substitui o badge de ativos. */
  extra?: string;
}

interface AcumuladorEntry {
  total: number;
  ativos: number;
  ids: string[];
}
type Acumulador = Map<string, AcumuladorEntry>;

const STATUS_VAZIO: Record<StatusChamado, number> = {
  Aberto: 0,
  "Em andamento": 0,
  Agendado: 0,
  Pausado: 0,
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

      const u = { user: await obterUsuarioAtual() };
      const meuId = u.user?.id;

      const [chamadosRes, comentariosRes] = await Promise.all([
        supabase
          .from("chamados")
          .select(
            "id, numero, codigo, titulo, status, prioridade, prazo, criado_em, primeiro_resposta_em, resolvido_em, fechado_em, responsavel_id, loja, categoria, departamento_id",
          )
          .eq("workspace_id", workspaceId!)
          .order("criado_em", { ascending: false })
          .limit(1000),
        supabase
          .from("chamado_comentarios")
          .select("chamado_id")
          .eq("workspace_id", workspaceId!)
          .limit(1000),
      ]);

      if (chamadosRes.error) throw chamadosRes.error;

      const lista = chamadosRes.data ?? [];
      const comSet = new Set(
        (comentariosRes.data ?? []).map((c) => c.chamado_id as string),
      );
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

      const novoAcum = (): Acumulador => new Map();

      const acumLoja = novoAcum();
      const acumDep = novoAcum();
      const acumCat = novoAcum();
      const acumResp = novoAcum();

      const acumSla = novoAcum();
      const acumSem = novoAcum();
      const acumResolvidos = novoAcum();
      const acumStats = new Map<string, { total: number; resolvidos: number; ids: string[] }>();

      const addAcum = (
        mapa: Acumulador,
        chave: string | null | undefined,
        ativo: boolean,
        id: string,
      ) => {
        const k = chave && String(chave).trim() ? String(chave) : "__sem__";
        const cur = mapa.get(k) ?? { total: 0, ativos: 0, ids: [] };
        cur.total++;
        if (ativo) cur.ativos++;
        cur.ids.push(id);
        mapa.set(k, cur);
      };

      for (const c of lista) {
        porStatus[c.status as StatusChamado] = (porStatus[c.status as StatusChamado] ?? 0) + 1;
        porPrioridade[c.prioridade as PrioridadeChamado] =
          (porPrioridade[c.prioridade as PrioridadeChamado] ?? 0) + 1;

        const ativo =
          c.status !== "Fechado" && c.status !== "Cancelado" && c.status !== "Resolvido";
        if (c.status === "Aberto") abertos++;
        if (c.status === "Em andamento") emAndamento++;
        if (c.status === "Aguardando solicitante" || c.status === "Aguardando terceiros") aguardando++;

        const slaEstourado = !!(ativo && c.prazo && new Date(c.prazo) < agora);
        if (slaEstourado) vencidos++;
        if (meuId && c.responsavel_id === meuId && ativo) meusAtribuidos++;

        const criado = new Date(c.criado_em);
        if (criado >= inicioMes) totalMes++;
        const foiResolvido =
          !!c.resolvido_em || c.status === "Resolvido" || c.status === "Fechado";
        if (c.resolvido_em && new Date(c.resolvido_em) >= inicioMes) resolvidosMes++;
        if (c.fechado_em && new Date(c.fechado_em) >= inicioMes) fechadosMes++;

        addAcum(acumLoja, (c as { loja?: string | null }).loja, ativo, c.id);
        addAcum(acumDep, (c as { departamento_id?: string | null }).departamento_id, ativo, c.id);
        addAcum(acumCat, (c as { categoria?: string | null }).categoria, ativo, c.id);
        addAcum(acumResp, c.responsavel_id, ativo, c.id);

        if (slaEstourado) {
          addAcum(acumSla, c.departamento_id, true, c.id);
        }

        const semInteracao =
          ativo &&
          !(c as { primeiro_resposta_em?: string | null }).primeiro_resposta_em &&
          !comSet.has(c.id);
        if (semInteracao) {
          addAcum(acumSem, c.departamento_id, true, c.id);
        }

        if (foiResolvido) {
          addAcum(acumResolvidos, c.departamento_id, false, c.id);
        }

        const kdep =
          c.departamento_id && String(c.departamento_id).trim()
            ? String(c.departamento_id)
            : "__sem__";
        const stat = acumStats.get(kdep) ?? { total: 0, resolvidos: 0, ids: [] };
        stat.total++;
        if (foiResolvido) stat.resolvidos++;
        stat.ids.push(c.id);
        acumStats.set(kdep, stat);
      }

      // Reúne todos os IDs de departamento que aparecem em qualquer mapa
      const todosDepIds = new Set<string>();
      const coletarDeps = (m: Map<string, unknown>) => {
        for (const k of m.keys()) {
          if (k !== "__sem__") todosDepIds.add(k);
        }
      };
      coletarDeps(acumDep);
      coletarDeps(acumSla);
      coletarDeps(acumSem);
      coletarDeps(acumResolvidos);
      coletarDeps(acumStats);

      const depIds = Array.from(todosDepIds);
      const respIds = Array.from(acumResp.keys()).filter((k) => k !== "__sem__");

      const [depRes, perfRes] = await Promise.all([
        depIds.length
          ? dados.from("departamentos").select("id, nome").in("id", depIds)
          : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
        respIds.length
          ? dados.from("perfis").select("id, nome").in("id", respIds)
          : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
      ]);

      const nomeDep = new Map<string, string>();
      (depRes.data ?? []).forEach((d) => nomeDep.set(d.id, d.nome));
      const nomeResp = new Map<string, string>();
      (perfRes.data ?? []).forEach((p) => nomeResp.set(p.id, p.nome));

      const rotuloDepartamento = (k: string) =>
        k === "__sem__" ? "Sem departamento" : nomeDep.get(k) ?? "—";

      const construirRanking = (
        mapa: Acumulador,
        resolverNome: (k: string) => string,
      ): RankingItem[] =>
        Array.from(mapa.entries())
          .map(([chave, v]) => ({
            chave,
            rotulo: chave === "__sem__" ? "Sem definição" : resolverNome(chave),
            total: v.total,
            ativos: v.ativos,
            ids: v.ids,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

      const departamentosPiorIndiceResolucao: RankingItem[] = Array.from(acumStats.entries())
        .filter(([, v]) => v.total >= 3)
        .map(([chave, v]) => {
          const taxa = v.total > 0 ? v.resolvidos / v.total : 0;
          const pct = Math.round(taxa * 100);
          const item: RankingItem & { _taxa: number } = {
            chave,
            rotulo: rotuloDepartamento(chave),
            total: v.total,
            ativos: v.total - v.resolvidos,
            ids: v.ids,
            extra: `${pct}% resolvidos`,
            _taxa: taxa,
          };
          return item;
        })
        .sort((a, b) => a._taxa - b._taxa)
        .slice(0, 5)
        .map(({ _taxa, ...rest }) => {
          void _taxa;
          return rest;
        });

      const departamentosMaisResolvem: RankingItem[] = Array.from(acumResolvidos.entries())
        .map(([chave, v]) => {
          const stat = acumStats.get(chave);
          const pct = stat && stat.total > 0 ? Math.round((v.total / stat.total) * 100) : 0;
          return {
            chave,
            rotulo: rotuloDepartamento(chave),
            total: v.total,
            ativos: 0,
            ids: v.ids,
            extra: stat ? `${pct}% do total` : undefined,
          };
        })
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
        topDepartamentos: construirRanking(acumDep, rotuloDepartamento),
        topCategorias: construirRanking(acumCat, (k) => k),
        topResponsaveis: construirRanking(acumResp, (k) => nomeResp.get(k) ?? "—"),
        slaEstouradoPorDepartamento: construirRanking(acumSla, rotuloDepartamento),
        semInteracaoPorDepartamento: construirRanking(acumSem, rotuloDepartamento),
        departamentosMaisResolvem,
        departamentosPiorIndiceResolucao,
      };
    },
  });
}
