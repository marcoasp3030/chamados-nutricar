import { Link } from "@tanstack/react-router";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import { bordaPrioridade } from "@/componentes/suporte/FaixaPrioridade";
import type { ChamadoComPessoas } from "@/tipos/chamado";
import { cn } from "@/lib/utils";

interface Props {
  chamado: ChamadoComPessoas;
  slug: string;
  acao?: React.ReactNode;
  compacto?: boolean;
  mostrarResponsavel?: boolean;
}

export function LinhaChamadoSuporte({ chamado, slug, acao, compacto, mostrarResponsavel }: Props) {
  const prazo = chamado.prazo ? new Date(chamado.prazo) : null;
  const atrasado =
    prazo &&
    isPast(prazo) &&
    !["Fechado", "Cancelado", "Resolvido"].includes(chamado.status);

  const prioridadeAlta =
    chamado.prioridade === "Urgente" || chamado.prioridade === "Alta";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
        bordaPrioridade(chamado.prioridade),
        atrasado && "border-red-500/40 bg-red-500/[0.03]",
        prioridadeAlta && !atrasado && "bg-card",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <BadgePrioridade
            prioridade={chamado.prioridade}
            className={cn(
              "text-xs font-bold",
              chamado.prioridade === "Urgente" && "border-red-500 bg-red-600 text-white",
              chamado.prioridade === "Alta" && "border-orange-500 bg-orange-600 text-white",
            )}
          />
          <span className="font-mono text-xs text-muted-foreground">
            {chamado.codigo ?? `#${chamado.numero}`}
          </span>
          <BadgeStatus status={chamado.status} />
          {atrasado && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" /> Vencido
            </span>
          )}
        </div>
        <Link
          to="/w/$slug/chamados/$numero"
          params={{ slug, numero: String(chamado.numero) }}
          className="mt-1.5 block text-base font-semibold leading-snug text-foreground hover:text-primary"
        >
          {chamado.titulo}
        </Link>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {chamado.loja && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
              <MapPin className="h-3 w-3" />
              {chamado.loja}
            </span>
          )}
          {chamado.categoria && <span>{chamado.categoria}</span>}
          {mostrarResponsavel && chamado.responsavel && (
            <span className="font-medium text-foreground/80">
              Técnico: {chamado.responsavel.nome}
            </span>
          )}
          {!compacto && chamado.solicitante && (
            <span>Solicitante: {chamado.solicitante.nome}</span>
          )}
          {chamado.resolvido_em && (
            <span>
              Resolvido:{" "}
              {format(new Date(chamado.resolvido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          )}
          {!chamado.resolvido_em && prazo && (
            <span>Prazo: {format(prazo, "dd/MM/yyyy", { locale: ptBR })}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {acao}
        <Button asChild variant="outline" size="sm" className="gap-1 rounded-xl">
          <Link to="/w/$slug/chamados/$numero" params={{ slug, numero: String(chamado.numero) }}>
            Abrir <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
