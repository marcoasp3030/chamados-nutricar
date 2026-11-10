import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Inbox,
  Loader2,
  Search,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { useDepartamentos } from "@/componentes/configuracoes/AbaDepartamentos";
import { useCategoriasChamado } from "@/componentes/configuracoes/AbaCategorias";
import { useRelatorioChamados, LIMITE_RELATORIO } from "@/hooks/useRelatorioChamados";
import { FiltroMultiplo } from "@/componentes/relatorios/FiltroMultiplo";
import {
  GraficoBarras,
  GraficoEvolucao,
  GraficoRosca,
  LegendaRosca,
  MapaCalor,
  ROTULO_METRICA,
  type MetricaGrafico,
} from "@/componentes/relatorios/GraficosRelatorio";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import {
  PRIORIDADES_CHAMADO,
  STATUS_CHAMADO,
  TIPOS_CHAMADO,
  type PrioridadeChamado,
  type StatusChamado,
  type TipoChamado,
} from "@/tipos/chamado";
import { rotuloPrioridade, rotuloStatusChamado, rotuloTipoChamado } from "@/utilitarios/traducoes";
import {
  PRESETS_PERIODO,
  ROTULO_CAMPO_DATA,
  ROTULO_DIMENSAO,
  agruparPor,
  aplicarFiltros,
  aplicarFiltrosSemPeriodo,
  calcularKpis,
  contarFiltrosAtivos,
  filtrosPadrao,
  formatarDuracaoHoras,
  formatarPercentual,
  granularidadeSugerida,
  intervaloPreset,
  mapaCalor,
  serieTemporal,
  type CampoDataRelatorio,
  type Dicionarios,
  type DimensaoRelatorio,
  type FiltrosRelatorio,
  type Granularidade,
  type PresetPeriodo,
} from "@/utilitarios/relatorios";
import { exportarCsv, exportarExcel, exportarPdf } from "@/utilitarios/relatorios-exportacao";
import { cn } from "@/lib/utils";

const SEM = "__sem__";
const POR_PAGINA = 25;

const DIMENSOES: DimensaoRelatorio[] = [
  "categoria",
  "departamento",
  "responsavel",
  "solicitante",
  "loja",
  "status",
  "prioridade",
  "tipo",
];

/** Dimensões que possuem filtro correspondente (drill-down ao clicar). */
const DIMENSAO_PARA_FILTRO: Partial<Record<DimensaoRelatorio, keyof FiltrosRelatorio>> = {
  status: "status",
  prioridade: "prioridades",
  tipo: "tipos",
  categoria: "categorias",
  departamento: "departamentos",
  responsavel: "responsaveis",
  loja: "lojas",
};

const paraInputData = (d: Date) => format(d, "yyyy-MM-dd");
const deInputData = (v: string, fimDoDia: boolean) => {
  const [a, m, d] = v.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  return fimDoDia ? endOfDay(dt) : startOfDay(dt);
};

/* ------------------------------------------------------------------ */

function CartaoKpi({
  rotulo,
  valor,
  icone: Icone,
  rodape,
  delta,
  destaque,
}: {
  rotulo: string;
  valor: string | number;
  icone: typeof Inbox;
  rodape?: string;
  /** Variação % vs período anterior; positivo = aumento. */
  delta?: number | null;
  destaque?: "ok" | "alerta";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </span>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary",
            destaque === "alerta" && "bg-destructive/10 text-destructive",
          )}
        >
          <Icone className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold leading-none tracking-tight tabular-nums">
        {valor}
      </div>
      <div className="mt-2 flex min-h-4 items-center gap-2 text-xs text-muted-foreground">
        {delta !== undefined && delta !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              delta === 0
                ? "text-muted-foreground"
                : delta > 0
                  ? "text-primary"
                  : "text-destructive",
            )}
            title="Variação em relação ao período anterior de mesma duração"
          >
            {delta > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : delta < 0 ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
        {rodape && <span>{rodape}</span>}
      </div>
    </div>
  );
}

function Painel({
  titulo,
  descricao,
  acoes,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
        </div>
        {acoes}
      </header>
      {children}
    </section>
  );
}

function variacao(atual: number, anterior: number | undefined): number | null {
  if (anterior === undefined) return null;
  if (anterior === 0) return atual === 0 ? 0 : null;
  return ((atual - anterior) / anterior) * 100;
}

/* ------------------------------------------------------------------ */

export function PaginaRelatorios() {
  const { workspaceAtual } = useWorkspaceStore();
  const workspaceId = workspaceAtual?.id;
  const slug = workspaceAtual?.slug ?? "";

  const [filtros, setFiltros] = useState<FiltrosRelatorio>(filtrosPadrao);
  const [preset, setPreset] = useState<PresetPeriodo | "custom">("30d");
  const [dimensao, setDimensao] = useState<DimensaoRelatorio>("categoria");
  const [metrica, setMetrica] = useState<MetricaGrafico>("total");
  const [granManual, setGranManual] = useState<Granularidade | null>(null);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);
  const [exportando, setExportando] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const gran = granManual ?? granularidadeSugerida(filtros.inicio, filtros.fim);

  // Período anterior de mesma duração (para variação nos KPIs).
  const anterior = useMemo(() => {
    const dias = Math.max(
      1,
      Math.round((filtros.fim.getTime() - filtros.inicio.getTime()) / 864e5),
    );
    return {
      inicio: startOfDay(subDays(filtros.inicio, dias)),
      fim: new Date(filtros.inicio.getTime() - 1),
    };
  }, [filtros.inicio, filtros.fim]);

  const consulta = useRelatorioChamados(workspaceId, filtros.inicio, filtros.fim);
  const consultaAnt = useRelatorioChamados(workspaceId, anterior.inicio, anterior.fim);
  const { data: departamentos = [] } = useDepartamentos(workspaceId);
  const { data: categoriasCfg = [] } = useCategoriasChamado(workspaceId);
  const { data: membros = [] } = useMembrosWorkspace(workspaceId, { incluirInativos: true });

  const dic: Dicionarios = useMemo(
    () => ({
      departamentos: new Map(departamentos.map((d) => [d.id, d.nome])),
      pessoas: new Map(
        membros.map((m) => [m.usuario_id, m.perfil?.nome ?? m.perfil?.email ?? "—"]),
      ),
    }),
    [departamentos, membros],
  );

  const brutos = consulta.data?.chamados;

  /* ---- opções dos filtros ---- */
  const opcoes = useMemo(() => {
    const cats = new Set<string>(categoriasCfg.map((c) => c.nome));
    const lojas = new Set<string>();
    let semCat = false;
    let semLoja = false;
    let semResp = false;
    for (const c of brutos ?? []) {
      if (c.categoria) cats.add(c.categoria);
      else semCat = true;
      if (c.loja) lojas.add(c.loja);
      else semLoja = true;
      if (!c.responsavel_id) semResp = true;
    }
    const ord = (a: string, b: string) => a.localeCompare(b, "pt-BR");
    return {
      status: STATUS_CHAMADO.map((s) => ({ valor: s, rotulo: rotuloStatusChamado[s] })),
      prioridades: PRIORIDADES_CHAMADO.map((p) => ({ valor: p, rotulo: rotuloPrioridade[p] })),
      tipos: TIPOS_CHAMADO.map((t) => ({ valor: t, rotulo: rotuloTipoChamado[t] })),
      categorias: [
        ...[...cats].sort(ord).map((c) => ({ valor: c, rotulo: c })),
        ...(semCat ? [{ valor: SEM, rotulo: "Sem categoria" }] : []),
      ],
      departamentos: departamentos.map((d) => ({ valor: d.id, rotulo: d.nome })),
      responsaveis: [
        ...membros
          .map((m) => ({ valor: m.usuario_id, rotulo: m.perfil?.nome ?? m.perfil?.email ?? "—" }))
          .sort((a, b) => ord(a.rotulo, b.rotulo)),
        ...(semResp ? [{ valor: SEM, rotulo: "Não atribuído" }] : []),
      ],
      lojas: [
        ...[...lojas].sort(ord).map((l) => ({ valor: l, rotulo: l })),
        ...(semLoja ? [{ valor: SEM, rotulo: "Sem loja" }] : []),
      ],
    };
  }, [brutos, categoriasCfg, departamentos, membros]);

  /* ---- cálculos ---- */
  const calc = useMemo(() => {
    if (!brutos) return null;
    const filtrados = aplicarFiltros(brutos, filtros);
    const kpis = calcularKpis(filtrados, filtros);
    const serie = serieTemporal(aplicarFiltrosSemPeriodo(brutos, filtros), filtros, gran);
    const porStatus = agruparPor(filtrados, "status", dic);
    const porPrioridade = agruparPor(filtrados, "prioridade", dic);
    const agrupado = agruparPor(filtrados, dimensao, dic);
    const calor = mapaCalor(filtrados);
    const resumos = (
      [
        "status",
        "prioridade",
        "tipo",
        "categoria",
        "departamento",
        "responsavel",
        "loja",
      ] as DimensaoRelatorio[]
    )
      .filter((d) => d !== dimensao)
      .map((d) => ({ dimensao: d, itens: agruparPor(filtrados, d, dic) }));
    return { filtrados, kpis, serie, porStatus, porPrioridade, agrupado, calor, resumos };
  }, [brutos, filtros, gran, dimensao, dic]);

  const kpisAnt = useMemo(() => {
    const ant = consultaAnt.data?.chamados;
    if (!ant) return undefined;
    const f: FiltrosRelatorio = { ...filtros, inicio: anterior.inicio, fim: anterior.fim };
    return calcularKpis(aplicarFiltros(ant, f), f);
  }, [consultaAnt.data, filtros, anterior]);

  const tabela = useMemo(() => {
    if (!calc) return { linhas: [], total: 0 };
    const t = busca.trim().toLowerCase();
    const linhas = t
      ? calc.filtrados.filter(
          (c) =>
            c.titulo.toLowerCase().includes(t) ||
            String(c.numero).includes(t) ||
            (c.codigo ?? "").toLowerCase().includes(t) ||
            (c.loja ?? "").toLowerCase().includes(t),
        )
      : calc.filtrados;
    return { linhas, total: linhas.length };
  }, [calc, busca]);

  const paginasTotal = Math.max(1, Math.ceil(tabela.total / POR_PAGINA));
  const paginaAtual = Math.min(pagina, paginasTotal - 1);
  const linhasPagina = tabela.linhas.slice(
    paginaAtual * POR_PAGINA,
    (paginaAtual + 1) * POR_PAGINA,
  );

  /* ---- ações ---- */
  const atualizar = (parcial: Partial<FiltrosRelatorio>) => {
    setFiltros((f) => ({ ...f, ...parcial }));
    setPagina(0);
  };

  const aplicarPreset = (p: PresetPeriodo) => {
    setPreset(p);
    setGranManual(null);
    atualizar(intervaloPreset(p));
  };

  const aoMudarData = (qual: "inicio" | "fim", v: string) => {
    if (!v) return;
    const d = deInputData(v, qual === "fim");
    setPreset("custom");
    setGranManual(null);
    if (qual === "inicio")
      atualizar({ inicio: d, fim: d > filtros.fim ? endOfDay(d) : filtros.fim });
    else atualizar({ fim: d, inicio: d < filtros.inicio ? startOfDay(d) : filtros.inicio });
  };

  const limparFiltros = () => {
    const p = filtrosPadrao();
    setFiltros((f) => ({ ...p, inicio: f.inicio, fim: f.fim, campoData: f.campoData }));
  };

  const alternarFiltroDimensao = (dim: DimensaoRelatorio, chave: string) => {
    const campo = DIMENSAO_PARA_FILTRO[dim];
    if (!campo) return;
    const atual = filtros[campo] as string[];
    atualizar({
      [campo]: atual.includes(chave) ? atual.filter((x) => x !== chave) : [...atual, chave],
    } as Partial<FiltrosRelatorio>);
  };

  const exportar = async (tipo: "xlsx" | "csv" | "pdf") => {
    if (!calc || !workspaceAtual) return;
    if (calc.filtrados.length === 0) {
      toast.error("Não há chamados para exportar com os filtros atuais.");
      return;
    }
    setExportando(true);
    try {
      const dados = {
        workspaceNome: workspaceAtual.nome,
        filtros,
        chamados: calc.filtrados,
        kpis: calc.kpis,
        serie: calc.serie,
        dimensao,
        agrupado: calc.agrupado,
        resumos: calc.resumos,
        dic,
      };
      if (tipo === "xlsx") await exportarExcel(dados);
      else if (tipo === "csv") exportarCsv(dados);
      else await exportarPdf(dados);
      toast.success("Relatório exportado");
    } catch (e) {
      console.error("[relatorios/exportar]", e);
      toast.error("Não foi possível gerar o arquivo.");
    } finally {
      setExportando(false);
    }
  };

  const nFiltros = contarFiltrosAtivos(filtros);
  const carregando = consulta.isLoading;
  const vazio = !!calc && calc.filtrados.length === 0;
  const podeDrill = !!DIMENSAO_PARA_FILTRO[dimensao];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-sm text-muted-foreground">
              Analise o volume e o desempenho dos chamados por período, categoria, departamento e
              mais.
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={!calc || exportando || vazio} className="gap-2">
              {exportando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => exportar("xlsx")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (resumo + detalhes)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportar("pdf")}>
              <FileText className="mr-2 h-4 w-4" /> PDF (relatório executivo)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportar("csv")}>
              <FileText className="mr-2 h-4 w-4" /> CSV (chamados filtrados)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filtros */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS_PERIODO.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={preset === p.id ? "default" : "outline"}
                className="h-9 rounded-lg px-3 text-xs"
                onClick={() => aplicarPreset(p.id)}
              >
                {p.rotulo}
              </Button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <label className="text-[11px] text-muted-foreground">
              De
              <Input
                type="date"
                className="mt-0.5 h-9 w-[140px]"
                value={paraInputData(filtros.inicio)}
                max={paraInputData(new Date())}
                onChange={(e) => aoMudarData("inicio", e.target.value)}
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Até
              <Input
                type="date"
                className="mt-0.5 h-9 w-[140px]"
                value={paraInputData(filtros.fim)}
                onChange={(e) => aoMudarData("fim", e.target.value)}
              />
            </label>
          </div>

          <label className="text-[11px] text-muted-foreground">
            Período baseado em
            <Select
              value={filtros.campoData}
              onValueChange={(v) => atualizar({ campoData: v as CampoDataRelatorio })}
            >
              <SelectTrigger className="mt-0.5 h-9 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROTULO_CAMPO_DATA) as CampoDataRelatorio[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {ROTULO_CAMPO_DATA[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-lg"
            onClick={() => setFiltrosAbertos((v) => !v)}
            aria-expanded={filtrosAbertos}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {nFiltros > 0 && (
              <Badge className="h-5 min-w-5 justify-center px-1.5">{nFiltros}</Badge>
            )}
          </Button>

          {nFiltros > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-muted-foreground"
              onClick={limparFiltros}
            >
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}

          {consulta.isFetching && !carregando && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Atualizando…
            </span>
          )}
        </div>

        {filtrosAbertos && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <FiltroMultiplo
              rotulo="Status"
              opcoes={opcoes.status}
              selecionados={filtros.status}
              onChange={(v) => atualizar({ status: v as StatusChamado[] })}
            />
            <FiltroMultiplo
              rotulo="Prioridade"
              opcoes={opcoes.prioridades}
              selecionados={filtros.prioridades}
              onChange={(v) => atualizar({ prioridades: v as PrioridadeChamado[] })}
            />
            <FiltroMultiplo
              rotulo="Tipo"
              opcoes={opcoes.tipos}
              selecionados={filtros.tipos}
              onChange={(v) => atualizar({ tipos: v as TipoChamado[] })}
            />
            <FiltroMultiplo
              rotulo="Categoria"
              opcoes={opcoes.categorias}
              selecionados={filtros.categorias}
              onChange={(v) => atualizar({ categorias: v })}
            />
            <FiltroMultiplo
              rotulo="Departamento"
              opcoes={opcoes.departamentos}
              selecionados={filtros.departamentos}
              onChange={(v) => atualizar({ departamentos: v })}
            />
            <FiltroMultiplo
              rotulo="Responsável"
              opcoes={opcoes.responsaveis}
              selecionados={filtros.responsaveis}
              onChange={(v) => atualizar({ responsaveis: v })}
            />
            <FiltroMultiplo
              rotulo="Loja"
              opcoes={opcoes.lojas}
              selecionados={filtros.lojas}
              onChange={(v) => atualizar({ lojas: v })}
            />
            <label className="ml-1 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={filtros.incluirSubchamados}
                onChange={(e) => atualizar({ incluirSubchamados: e.target.checked })}
              />
              Incluir subchamados
            </label>
          </div>
        )}
      </section>

      {consulta.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">Não foi possível carregar os dados do relatório.</span>
          <Button size="sm" variant="outline" onClick={() => consulta.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {consulta.data?.truncado && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Volume muito grande: foram carregados os {LIMITE_RELATORIO.toLocaleString("pt-BR")}{" "}
          chamados mais recentes. Reduza o período para um resultado completo.
        </div>
      )}

      {/* KPIs */}
      {carregando || !calc ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[108px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
          <CartaoKpi
            rotulo="Total"
            valor={calc.kpis.total}
            icone={Inbox}
            delta={variacao(calc.kpis.total, kpisAnt?.total)}
            rodape={`${calc.kpis.mediaPorDia.toFixed(1).replace(".", ",")}/dia`}
          />
          <CartaoKpi
            rotulo="Em aberto"
            valor={calc.kpis.abertos}
            icone={Clock}
            rodape={`${calc.kpis.vencidos} vencido(s)`}
            destaque={calc.kpis.vencidos > 0 ? "alerta" : undefined}
          />
          <CartaoKpi
            rotulo="Encerrados"
            valor={calc.kpis.encerrados}
            icone={CheckCircle2}
            delta={variacao(calc.kpis.encerrados, kpisAnt?.encerrados)}
            rodape={`${formatarPercentual(calc.kpis.taxaResolucao, 0)} do total`}
          />
          <CartaoKpi
            rotulo="Tempo de resolução"
            valor={formatarDuracaoHoras(calc.kpis.tempoMedioResolucaoH)}
            icone={Timer}
            rodape="média"
          />
          <CartaoKpi
            rotulo="1ª resposta"
            valor={formatarDuracaoHoras(calc.kpis.tempoMedio1aRespostaH)}
            icone={Clock}
            rodape="média"
          />
          <CartaoKpi
            rotulo="Prazo cumprido"
            valor={formatarPercentual(calc.kpis.cumprimentoPrazo, 0)}
            icone={CheckCircle2}
            rodape="dos encerrados com prazo"
          />
        </div>
      )}

      {vazio && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">Nenhum chamado encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajuste o período ou remova alguns filtros para ver resultados.
          </p>
        </div>
      )}

      {calc && !vazio && (
        <Tabs defaultValue="geral" className="space-y-4">
          <TabsList>
            <TabsTrigger value="geral">Visão geral</TabsTrigger>
            <TabsTrigger value="analise">Análise detalhada</TabsTrigger>
            <TabsTrigger value="dados">Dados ({calc.filtrados.length})</TabsTrigger>
          </TabsList>

          {/* ---------------- Visão geral ---------------- */}
          <TabsContent value="geral" className="space-y-4">
            <Painel
              titulo="Evolução de chamados"
              descricao="Criados × resolvidos ao longo do período"
              acoes={
                <div className="inline-flex rounded-lg border border-border p-0.5">
                  {(["dia", "semana", "mes"] as Granularidade[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGranManual(g)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                        gran === g
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {g === "mes" ? "Mês" : g === "dia" ? "Dia" : "Semana"}
                    </button>
                  ))}
                </div>
              }
            >
              <GraficoEvolucao dados={calc.serie} />
            </Painel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Painel titulo="Por status" descricao="Clique em uma fatia para filtrar">
                <GraficoRosca
                  itens={calc.porStatus}
                  total={calc.kpis.total}
                  onSelecionar={(c) => alternarFiltroDimensao("status", c)}
                />
                <div className="mt-3">
                  <LegendaRosca itens={calc.porStatus} />
                </div>
              </Painel>
              <Painel titulo="Por prioridade" descricao="Clique em uma fatia para filtrar">
                <GraficoRosca
                  itens={calc.porPrioridade}
                  total={calc.kpis.total}
                  onSelecionar={(c) => alternarFiltroDimensao("prioridade", c)}
                />
                <div className="mt-3">
                  <LegendaRosca itens={calc.porPrioridade} />
                </div>
              </Painel>
            </div>

            <Painel
              titulo="Quando os chamados são abertos"
              descricao="Distribuição por dia da semana e horário"
            >
              <MapaCalor matriz={calc.calor.matriz} max={calc.calor.max} />
            </Painel>
          </TabsContent>

          {/* ---------------- Análise detalhada ---------------- */}
          <TabsContent value="analise" className="space-y-4">
            <Painel
              titulo={`Análise por ${ROTULO_DIMENSAO[dimensao].toLowerCase()}`}
              descricao={
                podeDrill ? "Clique em uma barra ou linha para filtrar por esse item" : undefined
              }
              acoes={
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={dimensao}
                    onValueChange={(v) => setDimensao(v as DimensaoRelatorio)}
                  >
                    <SelectTrigger className="h-9 w-[170px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSOES.map((d) => (
                        <SelectItem key={d} value={d}>
                          Agrupar por {ROTULO_DIMENSAO[d].toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={metrica} onValueChange={(v) => setMetrica(v as MetricaGrafico)}>
                    <SelectTrigger className="h-9 w-[210px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROTULO_METRICA) as MetricaGrafico[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {ROTULO_METRICA[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            >
              <GraficoBarras
                itens={calc.agrupado}
                metrica={metrica}
                onSelecionar={podeDrill ? (c) => alternarFiltroDimensao(dimensao, c) : undefined}
              />
              {calc.agrupado.length > 12 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Gráfico exibe os 12 primeiros de {calc.agrupado.length}. A tabela abaixo mostra
                  todos.
                </p>
              )}
            </Painel>

            <Painel titulo="Tabela detalhada" descricao={`${calc.agrupado.length} grupo(s)`}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ROTULO_DIMENSAO[dimensao]}</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="min-w-[140px]">% do total</TableHead>
                      <TableHead className="text-right">Em aberto</TableHead>
                      <TableHead className="text-right">Encerrados</TableHead>
                      <TableHead className="text-right">Vencidos</TableHead>
                      <TableHead className="text-right">Resolução</TableHead>
                      <TableHead className="text-right">Tempo médio</TableHead>
                      <TableHead className="text-right">1ª resposta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calc.agrupado.map((i) => {
                      const marcado =
                        podeDrill &&
                        (filtros[DIMENSAO_PARA_FILTRO[dimensao]!] as string[]).includes(i.chave);
                      return (
                        <TableRow
                          key={i.chave}
                          onClick={
                            podeDrill ? () => alternarFiltroDimensao(dimensao, i.chave) : undefined
                          }
                          className={cn(podeDrill && "cursor-pointer", marcado && "bg-primary/5")}
                        >
                          <TableCell className="max-w-[260px] truncate font-medium">
                            {i.rotulo}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{i.total}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${i.participacao}%` }}
                                />
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {formatarPercentual(i.participacao)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{i.abertos}</TableCell>
                          <TableCell className="text-right tabular-nums">{i.encerrados}</TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              i.vencidos > 0 && "font-medium text-destructive",
                            )}
                          >
                            {i.vencidos}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatarPercentual(i.taxaResolucao, 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatarDuracaoHoras(i.tempoMedioResolucaoH)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatarDuracaoHoras(i.tempoMedio1aRespostaH)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Painel>
          </TabsContent>

          {/* ---------------- Dados ---------------- */}
          <TabsContent value="dados">
            <Painel
              titulo="Chamados do relatório"
              descricao={`${tabela.total} chamado(s) com os filtros atuais`}
              acoes={
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={busca}
                    onChange={(e) => {
                      setBusca(e.target.value);
                      setPagina(0);
                    }}
                    placeholder="Buscar por nº, título ou loja"
                    className="h-9 w-[260px] pl-8 text-xs"
                  />
                </div>
              }
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhasPagina.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          <Link
                            to="/w/$slug/chamados/$numero"
                            params={{ slug, numero: String(c.numero) }}
                            className="text-primary hover:underline"
                          >
                            #{c.numero}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate">{c.titulo}</TableCell>
                        <TableCell>
                          <BadgeStatus status={c.status} />
                        </TableCell>
                        <TableCell>
                          <BadgePrioridade prioridade={c.prioridade} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {c.categoria ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {c.departamento_id
                            ? (dic.departamentos.get(c.departamento_id) ?? "—")
                            : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {c.responsavel_id ? (dic.pessoas.get(c.responsavel_id) ?? "—") : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {format(new Date(c.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Página {paginaAtual + 1} de {paginasTotal}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={paginaAtual === 0}
                    onClick={() => setPagina(paginaAtual - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={paginaAtual >= paginasTotal - 1}
                    onClick={() => setPagina(paginaAtual + 1)}
                    aria-label="Próxima página"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Painel>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
