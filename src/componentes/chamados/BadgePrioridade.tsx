import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rotuloPrioridade } from "@/utilitarios/traducoes";
import type { PrioridadeChamado } from "@/tipos/chamado";

const cores: Record<PrioridadeChamado, string> = {
  Baixa: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200",
  Media: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200",
  Alta: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200",
  Urgente: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200",
};

export function BadgePrioridade({
  prioridade,
  className,
}: {
  prioridade: PrioridadeChamado;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", cores[prioridade], className)}>
      {rotuloPrioridade[prioridade]}
    </Badge>
  );
}
