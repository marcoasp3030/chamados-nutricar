import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rotuloStatusProjeto } from "@/utilitarios/traducoes";
import type { StatusProjeto } from "@/tipos/projeto";

const cores: Record<StatusProjeto, string> = {
  Planejado: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200",
  "Em andamento": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
  Pausado: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200",
  Concluido: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  Arquivado: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200",
};

export function BadgeStatusProjeto({
  status,
  className,
}: {
  status: StatusProjeto;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", cores[status], className)}>
      {rotuloStatusProjeto[status]}
    </Badge>
  );
}
