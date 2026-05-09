import { Link } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubchamados } from "@/hooks/useChamado";
import { BadgeStatus } from "./BadgeStatus";
import { BadgePrioridade } from "./BadgePrioridade";

interface Props {
  chamadoPaiId: string;
  slug: string;
  aoCriarSubchamado: () => void;
}

export function ArvoreSubchamados({ chamadoPaiId, slug, aoCriarSubchamado }: Props) {
  const { data, isLoading } = useSubchamados(chamadoPaiId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Subchamados {data && data.length > 0 && <span className="text-muted-foreground">({data.length})</span>}
        </h2>
        <Button size="sm" variant="outline" onClick={aoCriarSubchamado}>
          <Plus className="h-4 w-4" /> Novo subchamado
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este chamado não possui subchamados.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id}>
              <Link
                to="/w/$slug/chamados/$numero"
                params={{ slug, numero: String(c.numero) }}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="font-mono text-xs text-muted-foreground">#{c.numero}</span>
                <span className="flex-1 truncate font-medium">{c.titulo}</span>
                <BadgePrioridade prioridade={c.prioridade} />
                <BadgeStatus status={c.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
