import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  FolderTree,
  Inbox,
  Loader2,
  MessageSquareOff,
  PlayCircle,
  Plus,
  ShieldAlert,
  Store,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useIndicadoresPainel } from "@/hooks/useIndicadoresPainel";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import {
  PreviaIndicador,
  type FiltrosPrevia,
} from "@/componentes/painel/PreviaIndicador";
import {
  PRIORIDADES_CHAMADO,
  STATUS_KANBAN,
  type PrioridadeChamado,
  type StatusChamado,
} from "@/tipos/chamado";
import { rotuloPrioridade, rotuloStatusChamado } from "@/utilitarios/traducoes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/w/$slug/painel")({
  component: Painel,
  head: () => ({ meta: [{ title: "Painel | Nutricar" }] }),
});

interface CartaoIndicadorProps {
  rotulo: string;
  valor: number | string;
  icone: typeof Inbox;
  cor?: string;
  rodape?: string;
  onClick?: () => void;
}

function CartaoIndicador({ rotulo, valor, icone: Icone, cor, rodape, onClick }: CartaoIndicadorProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10",
            cor,
          )}
        >
          <Icone className="h-5 w-5" />
        </div>
        {onClick && (
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
            ver
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </p>
        <div className="mt-1 text-3xl font-bold leading-none tracking-tight text-foreground">
          {valor}
        </div>
        {rodape && <p className="mt-2 text-xs text-muted-foreground">{rodape}</p>}
      </div>
    </>
  );

  const base =
    "group relative block w-full overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-[var(--shadow-card)]";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring",
        )}
      >
        {conteudo}
      </button>
    );
  }
  return <div className={base}>{conteudo}</div>;
}

function BarraProporcional({
  rotulo,
  valor,
  total,
  corClasse,
  onClick,
}: {
  rotulo: string;
  valor: number;
  total: number;
  corClasse: string;
  onClick?: () => void;
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  const conteudo = (
    <>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-foreground">{rotulo}</span>
        <span className="text-muted-foreground">
          {valor} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", corClasse)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left rounded-md p-1 -m-1 transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {conteudo}
      </button>
    );
  }
  return <div>{conteudo}</div>;
}

const CORES_STATUS: Record<StatusChamado, string> = {
  Aberto: "bg-blue-500",
  "Em andamento": "bg-amber-500",
  "Aguardando solicitante": "bg-purple-500",
  "Aguardando terceiros": "bg-pink-500",
  Resolvido: "bg-emerald-500",
  Fechado: "bg-slate-500",
  Cancelado: "bg-red-500",
};

const CORES_PRIO: Record<PrioridadeChamado, string> = {
  Baixa: "bg-slate-400",
  Media: "bg-blue-500",
  Alta: "bg-orange-500",
  Urgente: "bg-red-500",
};

interface PreviaState {
  titulo: string;
  descricao?: string;
  filtros: FiltrosPrevia;
}

interface CartaoRankingItem {
  chave: string;
  rotulo: string;
  total: number;
  ativos: number;
  ids: string[];
  extra?: string;
}

interface CartaoRankingProps {
  titulo: string;
  descricao?: string;
  icone: typeof Inbox;
  itens: CartaoRankingItem[];
  corBarra: string;
  corIcone?: string;
  /** Rótulo do contador no header (ex: "total", "vencidos"). Padrão: total geral. */
  rotuloTotal?: string;
  /** Cor do badge "ativos" — padrão amber. */
  corAtivos?: string;
  /** Sufixo após o número total de cada item (ex: "vencidos", "sem ação"). */
  sufixoTotal?: string;
  vazio?: string;
  aoClicarItem?: (item: CartaoRankingItem) => void;
}

function CartaoRanking({
  titulo,
  descricao,
  icone: Icone,
  itens,
  corBarra,
  corIcone,
  rotuloTotal,
  corAtivos,
  sufixoTotal,
  vazio,
}: CartaoRankingProps) {
  const max = itens.reduce((m, i) => Math.max(m, i.total), 0);
  const totalGeral = itens.reduce((s, i) => s + i.total, 0);
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10",
              corIcone,
            )}
          >
            <Icone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight">{titulo}</h2>
            {descricao && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{descricao}</p>
            )}
          </div>
        </div>
        {totalGeral > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {totalGeral}
            {rotuloTotal ? ` ${rotuloTotal}` : ""}
          </span>
        )}
      </div>
      {itens.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-8">
          <p className="text-xs text-muted-foreground">{vazio ?? "Sem dados ainda"}</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {itens.map((it, idx) => {
            const pct = max > 0 ? Math.round((it.total / max) * 100) : 0;
            return (
              <li key={it.chave} className="group">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium text-foreground" title={it.rotulo}>
                      {it.rotulo}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-1.5">
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {it.total}
                    </span>
                    {sufixoTotal && (
                      <span className="text-[10px] text-muted-foreground">{sufixoTotal}</span>
                    )}
                    {it.extra ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          corAtivos ?? "bg-primary/10 text-primary",
                        )}
                      >
                        {it.extra}
                      </span>
                    ) : (
                      it.ativos > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            corAtivos ??
                              "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {it.ativos} ativos
                        </span>
                      )
                    )}
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", corBarra)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Painel() {
  const { workspaceAtual } = useWorkspaceStore();
  const { data, isLoading } = useIndicadoresPainel(workspaceAtual?.id);
  const [previa, setPrevia] = useState<PreviaState | null>(null);

  if (!workspaceAtual) return null;

  const abrir = (titulo: string, filtros: FiltrosPrevia, descricao?: string) =>
    setPrevia({ titulo, filtros, descricao });

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const ativos = data ? data.abertos + data.emAndamento + data.aguardando : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <header
        className="mb-6 overflow-hidden rounded-2xl border border-border p-6 shadow-[var(--shadow-card)]"
        style={{ background: "var(--gradient-soft)" }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {saudacao}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">
              {workspaceAtual.nome}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data
                ? `${ativos} ${ativos === 1 ? "chamado ativo" : "chamados ativos"}${
                    data.vencidos > 0 ? ` • ${data.vencidos} vencido${data.vencidos > 1 ? "s" : ""}` : ""
                  }`
                : "Carregando indicadores..."}
            </p>
          </div>
          <Button asChild size="lg" className="shadow-md">
            <Link to="/w/$slug/chamados/novo" params={{ slug: workspaceAtual.slug }}>
              <Plus className="h-4 w-4" /> Novo chamado
            </Link>
          </Button>
        </div>
      </header>

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operação atual</h2>
          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <CartaoIndicador
              rotulo="Chamados abertos"
              valor={data.abertos}
              icone={Inbox}
              cor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              onClick={() => abrir("Chamados abertos", { status: "Aberto" })}
            />
            <CartaoIndicador
              rotulo="Em andamento"
              valor={data.emAndamento}
              icone={PlayCircle}
              cor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              onClick={() => abrir("Em andamento", { status: "Em andamento" })}
            />
            <CartaoIndicador
              rotulo="Aguardando"
              valor={data.aguardando}
              icone={Clock}
              cor="bg-purple-500/10 text-purple-600 dark:text-purple-400"
              rodape="Solicitante ou terceiros"
              onClick={() =>
                abrir("Aguardando", { status: "Aguardando solicitante" }, "Solicitante ou terceiros")
              }
            />
            <CartaoIndicador
              rotulo="Resolvidos no mês"
              valor={data.resolvidosMes}
              icone={CheckCircle2}
              cor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              onClick={() =>
                abrir("Resolvidos no mês", { status: "Resolvido", periodo: "mes" })
              }
            />
          </section>

          <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultados do mês</h2>
          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <CartaoIndicador
              rotulo="Vencidos"
              valor={data.vencidos}
              icone={AlertTriangle}
              cor="bg-red-500/10 text-red-600 dark:text-red-400"
              rodape="Prazo expirado e ainda ativos"
              onClick={() =>
                abrir("Vencidos", { vencidos: true }, "Prazo expirado e ainda ativos")
              }
            />
            <CartaoIndicador
              rotulo="Atribuídos a mim"
              valor={data.meusAtribuidos}
              icone={UserCheck}
              cor="bg-primary/10 text-primary"
              onClick={() => abrir("Atribuídos a mim", { responsavel: "MEUS" })}
            />
            <CartaoIndicador
              rotulo="Abertos no mês"
              valor={data.totalMes}
              icone={TrendingUp}
              cor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              onClick={() => abrir("Abertos no mês", { periodo: "mes" })}
            />
            <CartaoIndicador
              rotulo="Fechados no mês"
              valor={data.fechadosMes}
              icone={CheckCircle2}
              cor="bg-slate-500/10 text-slate-600 dark:text-slate-300"
              onClick={() =>
                abrir("Fechados no mês", { status: "Fechado", periodo: "mes" })
              }
            />
          </section>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
              <h2 className="mb-4 text-sm font-semibold">Distribuição por status</h2>
              <div className="space-y-3">
                {STATUS_KANBAN.map((s) => (
                  <BarraProporcional
                    key={s}
                    rotulo={rotuloStatusChamado[s]}
                    valor={data.porStatus[s] ?? 0}
                    total={Object.values(data.porStatus).reduce((a, b) => a + b, 0)}
                    corClasse={CORES_STATUS[s]}
                    onClick={() => abrir(rotuloStatusChamado[s], { status: s })}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
              <h2 className="mb-4 text-sm font-semibold">Distribuição por prioridade</h2>
              <div className="space-y-3">
                {PRIORIDADES_CHAMADO.map((p) => (
                  <BarraProporcional
                    key={p}
                    rotulo={rotuloPrioridade[p]}
                    valor={data.porPrioridade[p] ?? 0}
                    total={Object.values(data.porPrioridade).reduce((a, b) => a + b, 0)}
                    corClasse={CORES_PRIO[p]}
                    onClick={() =>
                      abrir(`Prioridade ${rotuloPrioridade[p]}`, { prioridade: p })
                    }
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Últimos chamados</h2>
                <Link
                  to="/w/$slug/chamados"
                  params={{ slug: workspaceAtual.slug }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              {data.ultimos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum chamado registrado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {data.ultimos.map((c) => (
                    <li key={c.id}>
                      <Link
                        to="/w/$slug/chamados/$numero"
                        params={{ slug: workspaceAtual.slug, numero: String(c.numero) }}
                        className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {c.codigo ?? `#${c.numero}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(c.criado_em), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm font-medium">{c.titulo}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <BadgeStatus status={c.status} />
                          <BadgePrioridade prioridade={c.prioridade} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Indicadores estratégicos
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <CartaoRanking
              titulo="SLA estourado"
              descricao="Chamados ativos com prazo expirado"
              icone={ShieldAlert}
              itens={data.slaEstouradoPorDepartamento}
              corBarra="bg-red-500"
              corIcone="bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/10"
              corAtivos="bg-red-500/10 text-red-700 dark:text-red-400"
              rotuloTotal="vencidos"
              vazio="Nenhum SLA estourado"
            />
            <CartaoRanking
              titulo="Sem interação"
              descricao="Ativos sem resposta nem comentários"
              icone={MessageSquareOff}
              itens={data.semInteracaoPorDepartamento}
              corBarra="bg-orange-500"
              corIcone="bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/10"
              corAtivos="bg-orange-500/10 text-orange-700 dark:text-orange-400"
              rotuloTotal="parados"
              vazio="Tudo com tratativa"
            />
            <CartaoRanking
              titulo="Mais resolvem"
              descricao="Departamentos com maior volume resolvido"
              icone={Trophy}
              itens={data.departamentosMaisResolvem}
              corBarra="bg-emerald-500"
              corIcone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/10"
              corAtivos="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              rotuloTotal="resolvidos"
              vazio="Nenhuma resolução ainda"
            />
            <CartaoRanking
              titulo="Pior índice de resolução"
              descricao="Menor taxa de resolução (mín. 3 chamados)"
              icone={TrendingDown}
              itens={data.departamentosPiorIndiceResolucao}
              corBarra="bg-rose-500"
              corIcone="bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/10"
              corAtivos="bg-rose-500/10 text-rose-700 dark:text-rose-400"
              sufixoTotal="chamados"
              vazio="Sem dados suficientes"
            />
          </div>

          <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visões por dimensão
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <CartaoRanking
              titulo="Lojas com mais chamados"
              icone={Store}
              itens={data.topLojas}
              corBarra="bg-blue-500"
            />
            <CartaoRanking
              titulo="Departamentos"
              icone={Building2}
              itens={data.topDepartamentos}
              corBarra="bg-amber-500"
            />
            <CartaoRanking
              titulo="Categorias"
              icone={FolderTree}
              itens={data.topCategorias}
              corBarra="bg-emerald-500"
            />
            <CartaoRanking
              titulo="Responsáveis"
              icone={Users}
              itens={data.topResponsaveis}
              corBarra="bg-purple-500"
            />
          </div>
        </>
      )}

      {previa && (
        <PreviaIndicador
          aberto={!!previa}
          aoFechar={() => setPrevia(null)}
          titulo={previa.titulo}
          descricao={previa.descricao}
          filtrosIniciais={previa.filtros}
          workspaceId={workspaceAtual.id}
          slug={workspaceAtual.slug}
        />
      )}
    </div>
  );
}
