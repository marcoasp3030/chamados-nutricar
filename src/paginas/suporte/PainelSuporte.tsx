import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { isPast } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  PlayCircle,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamados } from "@/hooks/useChamados";
import { useUsuarioAtualId } from "@/auth/atual";
import type { PrioridadeChamado } from "@/tipos/chamado";
import { cn } from "@/lib/utils";
import {
  FiltrosPrioridade,
  type FiltroPrioridadeSuporte,
} from "@/componentes/suporte/FiltrosPrioridade";
import { ORDEM_PRIORIDADE } from "@/componentes/suporte/FaixaPrioridade";
import { LinhaChamadoSuporte } from "./LinhaChamadoSuporte";
import { Loader2 } from "lucide-react";
import { STATUS_CHAMADO_ATIVOS_SUPORTE } from "@/utilitarios/status-chamado-suporte";

const STATUS_ATIVOS = STATUS_CHAMADO_ATIVOS_SUPORTE;

function CartaoResumo({
  rotulo,
  valor,
  icone: Icone,
  cor,
  onClick,
  ativo,
}: {
  rotulo: string;
  valor: number;
  icone: typeof Ticket;
  cor: string;
  onClick?: () => void;
  ativo?: boolean;
}) {
  const conteudo = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </span>
        <Icone className={cn("h-4 w-4", cor)} />
      </div>
      <p className={cn("mt-2 text-3xl font-bold tabular-nums", cor)}>{valor}</p>
    </>
  );

  const base =
    "rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition-all active:scale-[0.98]";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          "hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
          ativo ? "border-primary ring-1 ring-primary/40" : "border-border",
        )}
      >
        {conteudo}
      </button>
    );
  }

  return <div className={cn(base, "border-border")}>{conteudo}</div>;
}

function ordenarPorPrioridade<T extends { prioridade: PrioridadeChamado; criado_em: string }>(
  lista: T[],
): T[] {
  return [...lista].sort((a, b) => {
    const pa = ORDEM_PRIORIDADE[a.prioridade] ?? 9;
    const pb = ORDEM_PRIORIDADE[b.prioridade] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
  });
}

export function PainelSuporte() {
  const { workspaceAtual } = useWorkspaceStore();
  const navigate = useNavigate();
  const usuarioId = useUsuarioAtualId();
  const [filtroPrioridade, setFiltroPrioridade] = useState<FiltroPrioridadeSuporte>("Todas");

  const { data: chamados, isLoading } = useChamados(workspaceAtual?.id, {
    responsavel_id: "MEUS",
    somenteRaiz: true,
  });

  const resumo = useMemo(() => {
    const lista = chamados ?? [];
    const ativos = lista.filter(
      (c) =>
        STATUS_ATIVOS.includes(c.status) && c.responsavel_id === usuarioId,
    );
    const resolvidos = lista.filter((c) => c.status === "Resolvido");
    const fechados = lista.filter((c) =>
      ["Fechado", "Cancelado"].includes(c.status),
    );
    const vencidos = ativos.filter((c) => {
      if (!c.prazo) return false;
      return isPast(new Date(c.prazo));
    });

    const contagensPrioridade: Record<FiltroPrioridadeSuporte, number> = {
      Todas: ativos.length,
      Urgente: ativos.filter((c) => c.prioridade === "Urgente").length,
      Alta: ativos.filter((c) => c.prioridade === "Alta").length,
      Media: ativos.filter((c) => c.prioridade === "Media").length,
      Baixa: ativos.filter((c) => c.prioridade === "Baixa").length,
    };

    const ativosFiltrados =
      filtroPrioridade === "Todas"
        ? ativos
        : ativos.filter((c) => c.prioridade === filtroPrioridade);

    return {
      total: lista.length,
      ativos: ordenarPorPrioridade(ativosFiltrados),
      resolvidos,
      fechados,
      vencidos,
      contagensPrioridade,
    };
  }, [chamados, usuarioId, filtroPrioridade]);

  if (!workspaceAtual) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <header className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PlayCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Minha área</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Chamados atribuídos a você — filtre por prioridade e abra para atuar.
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2.5">
        <CartaoResumo
          rotulo="Em aberto"
          valor={resumo.contagensPrioridade.Todas}
          icone={Clock}
          cor="text-blue-600 dark:text-blue-400"
        />
        <CartaoResumo
          rotulo="Vencidos"
          valor={resumo.vencidos.length}
          icone={AlertTriangle}
          cor="text-red-600 dark:text-red-400"
        />
        <CartaoResumo
          rotulo="Resolvidos"
          valor={resumo.resolvidos.length + resumo.fechados.length}
          icone={CheckCircle2}
          cor="text-emerald-600 dark:text-emerald-400"
          onClick={() =>
            navigate({
              to: "/w/$slug/suporte/resolvidos",
              params: { slug: workspaceAtual.slug },
            })
          }
        />
      </section>

      {resumo.contagensPrioridade.Todas > 0 && (
        <section className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Filtrar por prioridade
          </h2>
          <FiltrosPrioridade
            valor={filtroPrioridade}
            contagens={resumo.contagensPrioridade}
            onChange={setFiltroPrioridade}
          />
        </section>
      )}

      {resumo.ativos.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="h-4 w-4" />
            {filtroPrioridade === "Todas"
              ? "Meus chamados"
              : `Prioridade ${filtroPrioridade === "Media" ? "Média" : filtroPrioridade}`}
          </h2>
          <div className="space-y-2">
            {resumo.ativos.map((c) => (
              <LinhaChamadoSuporte key={c.id} chamado={c} slug={workspaceAtual.slug} />
            ))}
          </div>
        </section>
      )}

      {resumo.contagensPrioridade.Todas > 0 && resumo.ativos.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum chamado com esta prioridade no momento.
        </div>
      )}

      {(resumo.resolvidos.length > 0 || resumo.fechados.length > 0) && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <p className="text-sm text-foreground">
            <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-emerald-600" />
            {resumo.resolvidos.length + resumo.fechados.length} resolvido
            {resumo.resolvidos.length + resumo.fechados.length === 1 ? "" : "s"}
          </p>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link
              to="/w/$slug/suporte/resolvidos"
              params={{ slug: workspaceAtual.slug }}
            >
              Ver todos <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      )}

      {resumo.total === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <Ticket className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Nenhum chamado atribuído</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Quando o gestor atribuir um chamado a você, ele aparecerá aqui.
          </p>
        </div>
      )}
    </div>
  );
}
