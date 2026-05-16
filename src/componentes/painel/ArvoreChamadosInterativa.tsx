import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronRight, GitBranch, Loader2, Network } from "lucide-react";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { useArvoreChamados, type NoArvore } from "@/hooks/useArvoreChamados";
import { cn } from "@/lib/utils";

interface Props {
  workspaceId: string;
  slug: string;
}

function LinhaChamado({
  no,
  slug,
  nivel,
}: {
  no: NoArvore;
  slug: string;
  nivel: number;
}) {
  const [aberto, setAberto] = useState(nivel === 0);
  const temFilhos = no.filhos.length > 0;

  return (
    <li>
      <div
        className={cn(
          "group flex items-stretch gap-1 rounded-lg border border-transparent transition-colors hover:border-border hover:bg-muted/50",
        )}
        style={{ paddingLeft: nivel * 16 }}
      >
        <button
          type="button"
          onClick={() => temFilhos && setAberto((v) => !v)}
          aria-label={aberto ? "Recolher" : "Expandir"}
          className={cn(
            "flex w-6 shrink-0 items-center justify-center self-stretch rounded-l-lg",
            temFilhos
              ? "text-muted-foreground hover:bg-muted"
              : "pointer-events-none text-transparent",
          )}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              aberto && temFilhos && "rotate-90",
            )}
          />
        </button>

        <Link
          to="/w/$slug/chamados/$numero"
          params={{ slug, numero: String(no.numero) }}
          className="flex flex-1 flex-wrap items-center gap-2 py-2 pr-2"
        >
          <span className="font-mono text-[11px] text-muted-foreground">
            {no.codigo ?? `#${no.numero}`}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {no.titulo}
          </span>
          {temFilhos && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <GitBranch className="h-3 w-3" />
              {no.filhos.length}
            </span>
          )}
          <BadgePrioridade prioridade={no.prioridade} />
          <BadgeStatus status={no.status} />
          {no.responsavel_nome && (
            <span className="hidden text-[11px] text-muted-foreground md:inline">
              {no.responsavel_nome}
            </span>
          )}
          <span className="hidden text-[11px] text-muted-foreground lg:inline">
            {format(new Date(no.criado_em), "dd/MM HH:mm", { locale: ptBR })}
          </span>
        </Link>
      </div>

      {aberto && temFilhos && (
        <ul className="mt-1 space-y-1 border-l-2 border-dashed border-border/60 ml-3">
          {no.filhos.map((f) => (
            <LinhaChamado key={f.id} no={f} slug={slug} nivel={nivel + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ArvoreChamadosInterativa({ workspaceId, slug }: Props) {
  const { data, isLoading } = useArvoreChamados(workspaceId);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Chamados com subchamados
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Clique no chevron para expandir e ver a árvore
            </p>
          </div>
        </div>
        {data && data.totalPais > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {data.totalPais} {data.totalPais === 1 ? "pai" : "pais"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.pais.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum chamado com subchamados ainda.
        </p>
      ) : (
        <ul className="space-y-1">
          {data.pais.map((p) => (
            <LinhaChamado key={p.id} no={p} slug={slug} nivel={0} />
          ))}
        </ul>
      )}
    </section>
  );
}
