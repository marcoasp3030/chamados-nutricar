import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { format, isPast, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useChamados } from "@/hooks/useChamados";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import {
  PRIORIDADES_CHAMADO,
  STATUS_CHAMADO,
  type PrioridadeChamado,
  type StatusChamado,
} from "@/tipos/chamado";
import { rotuloPrioridade, rotuloStatusChamado } from "@/utilitarios/traducoes";
import { cn } from "@/lib/utils";

export interface FiltrosPrevia {
  status?: StatusChamado | "Todos";
  prioridade?: PrioridadeChamado | "Todas";
  responsavel?: "Todos" | "MEUS";
  periodo?: "todos" | "mes";
  vencidos?: boolean;
}

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  filtrosIniciais: FiltrosPrevia;
  workspaceId: string;
  slug: string;
}

export function PreviaIndicador({
  aberto,
  aoFechar,
  titulo,
  descricao,
  filtrosIniciais,
  workspaceId,
  slug,
}: Props) {
  const [filtros, setFiltros] = useState<FiltrosPrevia>(filtrosIniciais);

  useEffect(() => {
    if (aberto) setFiltros(filtrosIniciais);
  }, [aberto, filtrosIniciais]);

  const { data, isLoading } = useChamados(aberto ? workspaceId : undefined, {
    status: filtros.status,
    prioridade: filtros.prioridade,
    responsavel_id: filtros.responsavel,
  });

  const chamadosFiltrados = useMemo(() => {
    let lista = data ?? [];
    if (filtros.vencidos) {
      lista = lista.filter(
        (c) =>
          c.prazo &&
          isPast(new Date(c.prazo)) &&
          c.status !== "Fechado" &&
          c.status !== "Cancelado" &&
          c.status !== "Resolvido",
      );
    }
    if (filtros.periodo === "mes") {
      const ini = startOfMonth(new Date());
      lista = lista.filter((c) => new Date(c.criado_em) >= ini);
    }
    return lista;
  }, [data, filtros.vencidos, filtros.periodo]);

  const top = chamadosFiltrados.slice(0, 6);

  const search: Record<string, unknown> = {};
  if (filtros.status && filtros.status !== "Todos") search.status = filtros.status;
  if (filtros.prioridade && filtros.prioridade !== "Todas") search.prioridade = filtros.prioridade;
  if (filtros.responsavel && filtros.responsavel !== "Todos") search.responsavel = filtros.responsavel;
  if (filtros.periodo && filtros.periodo !== "todos") search.periodo = filtros.periodo;
  if (filtros.vencidos) search.vencidos = true;

  function alternarStatus(s: StatusChamado) {
    setFiltros((f) => ({ ...f, status: f.status === s ? "Todos" : s }));
  }
  function alternarPrioridade(p: PrioridadeChamado) {
    setFiltros((f) => ({ ...f, prioridade: f.prioridade === p ? "Todas" : p }));
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_CHAMADO.map((s) => {
                const ativo = filtros.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => alternarStatus(s)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      ativo
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted",
                    )}
                  >
                    {rotuloStatusChamado[s]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prioridade
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRIORIDADES_CHAMADO.map((p) => {
                const ativo = filtros.prioridade === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => alternarPrioridade(p)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      ativo
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted",
                    )}
                  >
                    {rotuloPrioridade[p]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                setFiltros((f) => ({
                  ...f,
                  responsavel: f.responsavel === "MEUS" ? "Todos" : "MEUS",
                }))
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                filtros.responsavel === "MEUS"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              Atribuídos a mim
            </button>
            <button
              type="button"
              onClick={() => setFiltros((f) => ({ ...f, vencidos: !f.vencidos }))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                filtros.vencidos
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              Apenas vencidos
            </button>
            <button
              type="button"
              onClick={() =>
                setFiltros((f) => ({
                  ...f,
                  periodo: f.periodo === "mes" ? "todos" : "mes",
                }))
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                filtros.periodo === "mes"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              Apenas do mês
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">
                Principais chamados
                <Badge variant="secondary" className="ml-2">
                  {chamadosFiltrados.length}
                </Badge>
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : top.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum chamado encontrado para os filtros selecionados.
              </p>
            ) : (
              <ul className="space-y-2">
                {top.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/w/$slug/chamados/$numero"
                      params={{ slug, numero: String(c.numero) }}
                      onClick={aoFechar}
                      className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.codigo ?? `#${c.numero}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(c.criado_em), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-medium">{c.titulo}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <BadgeStatus status={c.status} />
                        <BadgePrioridade prioridade={c.prioridade} />
                        {c.responsavel && (
                          <span className="text-xs text-muted-foreground">
                            • {c.responsavel.nome}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={aoFechar}>
            Fechar
          </Button>
          <Button asChild>
            <Link
              to="/w/$slug/chamados"
              params={{ slug }}
              search={search as never}
              onClick={aoFechar}
            >
              Ver lista completa <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
