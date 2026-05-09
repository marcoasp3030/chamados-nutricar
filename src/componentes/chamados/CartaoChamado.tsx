import { Link } from "@tanstack/react-router";
import { Calendar, AlertTriangle } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BadgePrioridade } from "./BadgePrioridade";
import { cn } from "@/lib/utils";
import type { ChamadoComPessoas, PrioridadeChamado } from "@/tipos/chamado";

const barraPrioridade: Record<PrioridadeChamado, string> = {
  Baixa: "bg-slate-300 dark:bg-slate-600",
  Media: "bg-blue-400",
  Alta: "bg-orange-400",
  Urgente: "bg-red-500",
};

function iniciais(nome?: string | null) {
  if (!nome) return "?";
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function CartaoChamado({
  chamado,
  slug,
  arrastavel = true,
  onDragStart,
}: {
  chamado: ChamadoComPessoas;
  slug: string;
  arrastavel?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const prazo = chamado.prazo ? new Date(chamado.prazo) : null;
  const atrasado = prazo && isPast(prazo) && chamado.status !== "Resolvido" && chamado.status !== "Fechado";
  const proximo = prazo && !atrasado && differenceInDays(prazo, new Date()) <= 2;

  return (
    <Link
      to="/w/$slug/chamados/$numero"
      params={{ slug, numero: String(chamado.numero) }}
      draggable={arrastavel}
      onDragStart={onDragStart}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        arrastavel && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span
        className={cn("absolute left-0 top-0 h-full w-1", barraPrioridade[chamado.prioridade])}
        aria-hidden
      />
      <div className="space-y-2.5 p-3 pl-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-medium text-muted-foreground">
            #{chamado.numero}
          </span>
          <BadgePrioridade prioridade={chamado.prioridade} className="text-[10px] px-1.5 py-0" />
        </div>

        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {chamado.titulo}
        </p>

        {chamado.tags && chamado.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {chamado.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            {chamado.responsavel ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                    {iniciais(chamado.responsavel.nome)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-muted-foreground">
                  {chamado.responsavel.nome}
                </span>
              </>
            ) : (
              <span className="text-xs italic text-muted-foreground">Sem responsável</span>
            )}
          </div>

          {prazo && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                atrasado
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : proximo
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-muted text-muted-foreground",
              )}
              title={`Prazo: ${format(prazo, "dd/MM/yyyy", { locale: ptBR })}`}
            >
              {atrasado ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
              {format(prazo, "dd/MM", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
