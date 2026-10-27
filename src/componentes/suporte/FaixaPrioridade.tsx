import { AlertTriangle, Flag } from "lucide-react";
import type { PrioridadeChamado } from "@/tipos/chamado";
import { rotuloPrioridade } from "@/utilitarios/traducoes";
import { cn } from "@/lib/utils";

const estilos: Record<
  PrioridadeChamado,
  { borda: string; fundo: string; texto: string; icone: string }
> = {
  Urgente: {
    borda: "border-red-500",
    fundo: "bg-red-500/12",
    texto: "text-red-900 dark:text-red-100",
    icone: "text-red-600 dark:text-red-400",
  },
  Alta: {
    borda: "border-orange-500",
    fundo: "bg-orange-500/12",
    texto: "text-orange-900 dark:text-orange-100",
    icone: "text-orange-600 dark:text-orange-400",
  },
  Media: {
    borda: "border-blue-500",
    fundo: "bg-blue-500/10",
    texto: "text-blue-900 dark:text-blue-100",
    icone: "text-blue-600 dark:text-blue-400",
  },
  Baixa: {
    borda: "border-slate-400",
    fundo: "bg-slate-500/10",
    texto: "text-slate-800 dark:text-slate-200",
    icone: "text-slate-600 dark:text-slate-400",
  },
};

export function FaixaPrioridade({
  prioridade,
  compacto,
}: {
  prioridade: PrioridadeChamado;
  compacto?: boolean;
}) {
  const e = estilos[prioridade];
  const destaque = prioridade === "Urgente" || prioridade === "Alta";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border-2 px-4",
        compacto ? "py-2.5" : "py-3.5",
        e.borda,
        e.fundo,
        destaque && prioridade === "Urgente" && "shadow-sm shadow-red-500/20",
      )}
    >
      <div className="flex items-center gap-2">
        {prioridade === "Urgente" ? (
          <AlertTriangle className={cn("h-5 w-5", e.icone)} />
        ) : (
          <Flag className={cn("h-5 w-5", e.icone)} />
        )}
        <span className={cn("text-xs font-bold uppercase tracking-wider", e.texto)}>
          Prioridade
        </span>
      </div>
      <span className={cn(compacto ? "text-base" : "text-xl", "font-bold", e.texto)}>
        {rotuloPrioridade[prioridade]}
      </span>
    </div>
  );
}

export function bordaPrioridade(prioridade: PrioridadeChamado): string {
  switch (prioridade) {
    case "Urgente":
      return "border-l-4 border-l-red-500";
    case "Alta":
      return "border-l-4 border-l-orange-500";
    case "Media":
      return "border-l-4 border-l-blue-500";
    default:
      return "border-l-4 border-l-slate-300 dark:border-l-slate-600";
  }
}

export const ORDEM_PRIORIDADE: Record<PrioridadeChamado, number> = {
  Urgente: 0,
  Alta: 1,
  Media: 2,
  Baixa: 3,
};
