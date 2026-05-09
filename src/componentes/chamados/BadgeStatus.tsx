import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rotuloStatusChamado } from "@/utilitarios/traducoes";
import type { StatusChamado } from "@/tipos/chamado";

const cores: Record<StatusChamado, string> = {
  Aberto: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900",
  "Em andamento":
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
  "Aguardando solicitante":
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-900",
  "Aguardando terceiros":
    "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950 dark:text-pink-200 dark:border-pink-900",
  Resolvido:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900",
  Fechado:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  Cancelado:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900",
};

export function BadgeStatus({ status, className }: { status: StatusChamado; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", cores[status], className)}>
      {rotuloStatusChamado[status]}
    </Badge>
  );
}
