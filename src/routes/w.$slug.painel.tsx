import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  PlayCircle,
  Plus,
  TrendingUp,
  UserCheck,
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
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{rotulo}</span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary",
            cor,
          )}
        >
          <Icone className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold text-foreground">{valor}</div>
      {rodape && <p className="mt-1 text-xs text-muted-foreground">{rodape}</p>}
    </>
  );

  const base =
    "block w-full rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] text-left";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          "transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
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
