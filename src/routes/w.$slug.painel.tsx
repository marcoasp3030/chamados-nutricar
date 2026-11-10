import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
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
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useIndicadoresPainel, type FiltrosPainel } from "@/hooks/useIndicadoresPainel";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { useDepartamentos } from "@/componentes/configuracoes/AbaDepartamentos";
import { useCategoriasChamado } from "@/componentes/configuracoes/AbaCategorias";
import { useUsuarioAtualId } from "@/auth/atual";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import {
  PreviaIndicador,
  type FiltrosPrevia,
} from "@/componentes/painel/PreviaIndicador";
import { ArvoreChamadosInterativa } from "@/componentes/painel/ArvoreChamadosInterativa";
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
  Agendado: "bg-indigo-500",
  Pausado: "bg-yellow-500",
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
  aoClicarItem,
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
            const conteudo = (
              <>
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
              </>
            );
            return (
              <li key={it.chave} className="group">
                {aoClicarItem ? (
                  <button
                    type="button"
                    onClick={() => aoClicarItem(it)}
                    className="-mx-2 block w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring"
                    title={`Ver chamados — ${it.rotulo}`}
                  >
                    {conteudo}
                  </button>
                ) : (
                  conteudo
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ChipAtalho({
  rotulo,
  icone: Icone,
  ativo = false,
  onClick,
}: {
  rotulo: string;
  icone?: typeof Inbox;
  ativo?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
        ativo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted",
      )}
    >
      {Icone && (
        <Icone
          className={cn("h-3.5 w-3.5", ativo ? "text-primary-foreground" : "text-muted-foreground")}
        />
      )}
      {rotulo}
    </button>
  );
}

function GrupoAtalhos({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {titulo}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

interface FiltroAtalho {
  chave: string;
  rotulo: string;
  filtros: FiltrosPainel;
}

function Painel() {
  const { workspaceAtual } = useWorkspaceStore();
  const [filtroAtalho, setFiltroAtalho] = useState<FiltroAtalho | null>(null);
  const { data, isLoading, isError, refetch } = useIndicadoresPainel(
    workspaceAtual?.id,
    filtroAtalho?.filtros ?? {},
  );
  const { data: membros } = useMembrosWorkspace(workspaceAtual?.id);
  const { data: departamentos } = useDepartamentos(workspaceAtual?.id);
  const { data: categorias } = useCategoriasChamado(workspaceAtual?.id);
  const usuarioId = useUsuarioAtualId();
  const [previa, setPrevia] = useState<PreviaState | null>(null);

  // Clicar num atalho aplica (ou remove, se já ativo) o filtro em todas as visões.
  const alternarFiltro = (chave: string, rotulo: string, filtros: FiltrosPainel) =>
    setFiltroAtalho((atual) =>
      atual?.chave === chave ? null : { chave, rotulo, filtros },
    );

  // Departamentos aos quais o usuário logado pertence (para "Minha área").
  const meusDepartamentos = useMemo(() => {
    const meu = (membros ?? []).find((m) => m.usuario_id === usuarioId);
    const ids = meu?.departamento_ids ?? [];
    return (departamentos ?? []).filter((d) => ids.includes(d.id));
  }, [membros, departamentos, usuarioId]);

  if (!workspaceAtual) return null;

  const abrir = (titulo: string, filtros: FiltrosPrevia, descricao?: string) => {
    // Mescla o filtro ativo de "Meus atalhos" para que a visão (modal) mostre os
    // mesmos números dos cartões. Em rankings (chamadoIds) o filtro já está
    // embutido nos ids calculados, então não re-aplicamos para evitar conflito.
    const base: FiltrosPrevia = filtros.chamadoIds
      ? {}
      : (filtroAtalho?.filtros ?? {});
    setPrevia({ titulo, filtros: { ...base, ...filtros }, descricao });
  };

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

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os indicadores do painel.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] md:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10">
                  <Filter className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Meus atalhos</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {filtroAtalho
                      ? `Visões filtradas por: ${filtroAtalho.rotulo}`
                      : "Clique num atalho para filtrar todas as visões abaixo."}
                  </p>
                </div>
              </div>
              {filtroAtalho && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setFiltroAtalho(null)}
                >
                  <X className="h-3.5 w-3.5" /> Limpar filtro
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <GrupoAtalhos titulo="Meus chamados">
                <ChipAtalho
                  rotulo="Todos os meus"
                  icone={UserCheck}
                  ativo={filtroAtalho?.chave === "meus"}
                  onClick={() => alternarFiltro("meus", "Atribuídos a mim", { responsavel: "MEUS" })}
                />
                <ChipAtalho
                  rotulo="Abertos"
                  icone={Inbox}
                  ativo={filtroAtalho?.chave === "meus-abertos"}
                  onClick={() =>
                    alternarFiltro("meus-abertos", "Meus abertos", {
                      responsavel: "MEUS",
                      status: "Aberto",
                    })
                  }
                />
                <ChipAtalho
                  rotulo="Em andamento"
                  icone={PlayCircle}
                  ativo={filtroAtalho?.chave === "meus-andamento"}
                  onClick={() =>
                    alternarFiltro("meus-andamento", "Meus em andamento", {
                      responsavel: "MEUS",
                      status: "Em andamento",
                    })
                  }
                />
                <ChipAtalho
                  rotulo="Resolvidos"
                  icone={CheckCircle2}
                  ativo={filtroAtalho?.chave === "meus-resolvidos"}
                  onClick={() =>
                    alternarFiltro("meus-resolvidos", "Meus resolvidos", {
                      responsavel: "MEUS",
                      status: "Resolvido",
                    })
                  }
                />
                <ChipAtalho
                  rotulo="Encerrados"
                  icone={CheckCircle2}
                  ativo={filtroAtalho?.chave === "meus-encerrados"}
                  onClick={() =>
                    alternarFiltro("meus-encerrados", "Meus encerrados", {
                      responsavel: "MEUS",
                      encerrados: true,
                    })
                  }
                />
                <ChipAtalho
                  rotulo="Vencidos"
                  icone={AlertTriangle}
                  ativo={filtroAtalho?.chave === "meus-vencidos"}
                  onClick={() =>
                    alternarFiltro("meus-vencidos", "Meus vencidos", {
                      responsavel: "MEUS",
                      vencidos: true,
                    })
                  }
                />
              </GrupoAtalhos>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Building2 className="h-3 w-3" /> Departamento
                  </p>
                  <Select
                    value={filtroAtalho?.filtros.departamento_id ?? "Todos"}
                    onValueChange={(v) => {
                      if (v === "Todos") {
                        setFiltroAtalho((a) => (a?.filtros.departamento_id ? null : a));
                        return;
                      }
                      const nome =
                        (departamentos ?? []).find((d) => d.id === v)?.nome ?? "Departamento";
                      setFiltroAtalho({
                        chave: `dep-${v}`,
                        rotulo: `Departamento: ${nome}`,
                        filtros: { departamento_id: v },
                      });
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos os departamentos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos os departamentos</SelectItem>
                      {meusDepartamentos.length > 0 && (
                        <>
                          {meusDepartamentos.map((d) => (
                            <SelectItem key={`meu-${d.id}`} value={d.id}>
                              {d.nome} (minha área)
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {(departamentos ?? [])
                        .filter((d) => !meusDepartamentos.some((m) => m.id === d.id))
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <FolderTree className="h-3 w-3" /> Categoria
                  </p>
                  <Select
                    value={filtroAtalho?.filtros.categoria ?? "Todas"}
                    onValueChange={(v) => {
                      if (v === "Todas") {
                        setFiltroAtalho((a) => (a?.filtros.categoria ? null : a));
                        return;
                      }
                      setFiltroAtalho({
                        chave: `cat-${v}`,
                        rotulo: `Categoria: ${v}`,
                        filtros: { categoria: v },
                      });
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas as categorias</SelectItem>
                      {(categorias ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.nome}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

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
                abrir(
                  "Aguardando",
                  {
                    statusIn: ["Aguardando solicitante", "Aguardando terceiros"],
                  },
                  "Solicitante ou terceiros",
                )
              }
            />
            <CartaoIndicador
              rotulo="Resolvidos no mês"
              valor={data.resolvidosMes}
              icone={CheckCircle2}
              cor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              onClick={() =>
                abrir("Resolvidos no mês", {
                  status: "Resolvido",
                  periodo: "mes",
                  campoData: "resolvido_em",
                })
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
              rotulo="Abertos por mim"
              valor={data.meusSolicitados}
              icone={User}
              cor="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
              rodape="Chamados que você solicitou"
              onClick={() => abrir("Abertos por mim", { solicitante: "MEUS" })}
            />
            <CartaoIndicador
              rotulo="Abertos no mês"
              valor={data.totalMes}
              icone={TrendingUp}
              cor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              onClick={() =>
                abrir("Abertos no mês", { periodo: "mes", campoData: "criado_em" })
              }
            />
            <CartaoIndicador
              rotulo="Fechados no mês"
              valor={data.fechadosMes}
              icone={CheckCircle2}
              cor="bg-slate-500/10 text-slate-600 dark:text-slate-300"
              onClick={() =>
                abrir("Fechados no mês", {
                  status: "Fechado",
                  periodo: "mes",
                  campoData: "fechado_em",
                })
              }
            />
          </section>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
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

            <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Meus chamados</h2>
                <button
                  type="button"
                  onClick={() => abrir("Meus chamados", { solicitante: "MEUS" })}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ver todos
                </button>
              </div>
              {data.meusChamados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você ainda não abriu nenhum chamado.</p>
              ) : (
                <ul className="space-y-2">
                  {data.meusChamados.map((c) => (
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
            Árvore de chamados
          </h2>
          <ArvoreChamadosInterativa
            workspaceId={workspaceAtual.id}
            slug={workspaceAtual.slug}
          />

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
              aoClicarItem={(it) =>
                abrir(
                  `SLA estourado — ${it.rotulo}`,
                  { chamadoIds: it.ids },
                  `${it.total} chamado${it.total === 1 ? "" : "s"} ativo${it.total === 1 ? "" : "s"} com prazo expirado`,
                )
              }
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
              aoClicarItem={(it) =>
                abrir(
                  `Sem interação — ${it.rotulo}`,
                  { chamadoIds: it.ids },
                  `${it.total} chamado${it.total === 1 ? "" : "s"} sem primeira resposta nem comentários`,
                )
              }
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
              aoClicarItem={(it) =>
                abrir(
                  `Resolvidos — ${it.rotulo}`,
                  { chamadoIds: it.ids },
                  `${it.total} chamado${it.total === 1 ? "" : "s"} resolvido${it.total === 1 ? "" : "s"}${it.extra ? ` (${it.extra})` : ""}`,
                )
              }
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
              aoClicarItem={(it) =>
                abrir(
                  `Índice de resolução — ${it.rotulo}`,
                  { chamadoIds: it.ids },
                  `${it.total} chamado${it.total === 1 ? "" : "s"} no total${it.extra ? ` • ${it.extra}` : ""}`,
                )
              }
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
              aoClicarItem={(it) =>
                abrir(`Loja — ${it.rotulo}`, { chamadoIds: it.ids })
              }
            />
            <CartaoRanking
              titulo="Departamentos"
              icone={Building2}
              itens={data.topDepartamentos}
              corBarra="bg-amber-500"
              aoClicarItem={(it) =>
                abrir(`Departamento — ${it.rotulo}`, { chamadoIds: it.ids })
              }
            />
            <CartaoRanking
              titulo="Categorias"
              icone={FolderTree}
              itens={data.topCategorias}
              corBarra="bg-emerald-500"
              aoClicarItem={(it) =>
                abrir(`Categoria — ${it.rotulo}`, { chamadoIds: it.ids })
              }
            />
            <CartaoRanking
              titulo="Responsáveis"
              icone={Users}
              itens={data.topResponsaveis}
              corBarra="bg-purple-500"
              aoClicarItem={(it) =>
                abrir(`Responsável — ${it.rotulo}`, { chamadoIds: it.ids })
              }
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
