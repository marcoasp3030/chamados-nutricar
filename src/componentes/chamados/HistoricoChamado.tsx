import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useHistoricoChamado } from "@/hooks/useChamado";

export function HistoricoChamado({ chamadoId }: { chamadoId: string }) {
  const { data, isLoading } = useHistoricoChamado(chamadoId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem registros de histórico.</p>;
  }

  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {data.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-primary" />
          <div className="text-sm">
            <span className="font-medium">{h.usuario?.nome ?? "Sistema"}</span>{" "}
            <span className="text-muted-foreground">{h.acao}</span>
            {h.campo && h.valor_novo && (
              <span className="text-foreground">
                {" — "}
                <span className="text-muted-foreground line-through">
                  {h.valor_anterior || "—"}
                </span>{" "}
                → <span className="font-medium">{h.valor_novo}</span>
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(h.criado_em), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
          </div>
        </li>
      ))}
    </ol>
  );
}
