import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamados } from "@/hooks/useChamados";
import { useUsuarioAtualId } from "@/auth/atual";
import { useFunisKanban, chamadoAtendeFunil, type FunilKanban } from "@/hooks/useFunisKanban";
import { CartaoChamadoComPrevia } from "@/componentes/chamados/CartaoChamadoComPrevia";
import { GerenciadorFunis } from "@/componentes/chamados/GerenciadorFunis";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/dados/atual";
import type { ChamadoComPessoas, StatusChamado } from "@/tipos/chamado";

export function QuadroChamados() {
  const { workspaceAtual } = useWorkspaceStore();
  const usuarioId = useUsuarioAtualId();
  const { data: chamados, isLoading } = useChamados(workspaceAtual?.id, { somenteRaiz: true });
  const { data: funis = [], isLoading: carregandoFunis } = useFunisKanban(
    workspaceAtual?.id,
    usuarioId,
  );
  const queryClient = useQueryClient();
  const [colunaAtiva, setColunaAtiva] = useState<string | null>(null);

  const colunas = useMemo(() => {
    const mapa = new Map<string, ChamadoComPessoas[]>();
    funis.forEach((f) => mapa.set(f.id, []));
    (chamados ?? []).forEach((c) => {
      // primeiro funil que aceita o chamado
      for (const f of funis) {
        if (chamadoAtendeFunil(c as any, f)) {
          mapa.get(f.id)!.push(c);
          break;
        }
      }
    });
    return mapa;
  }, [chamados, funis]);

  const moverStatus = useMutation({
    mutationFn: async (vars: { id: string; status: StatusChamado }) => {
      const { error } = await db
        .from("chamados")
        .update({ status: vars.status })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
      toast.success("Status atualizado.");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível atualizar.", { description: e.message }),
  });

  if (!workspaceAtual) return null;

  if (isLoading || carregandoFunis) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2 px-2">
        {usuarioId && workspaceAtual && (
          <GerenciadorFunis workspaceId={workspaceAtual.id} usuarioId={usuarioId}>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" /> Gerenciar funis
            </Button>
          </GerenciadorFunis>
        )}
      </div>

      <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4 xl:gap-4">
        {funis.map((funil) => {
          const itens = colunas.get(funil.id) ?? [];
          const ativa = colunaAtiva === funil.id;
          return (
            <ColunaFunil
              key={funil.id}
              funil={funil}
              itens={itens}
              ativa={ativa}
              slug={workspaceAtual.slug}
              onDragOver={() => setColunaAtiva(funil.id)}
              onDragLeave={() =>
                setColunaAtiva((s) => (s === funil.id ? null : s))
              }
              onDrop={(id) => {
                setColunaAtiva(null);
                if (funil.tipo === "status" && funil.status_origem) {
                  moverStatus.mutate({ id, status: funil.status_origem });
                } else {
                  toast.info("Este funil é filtrado — o status do chamado não foi alterado.");
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function ColunaFunil({
  funil,
  itens,
  ativa,
  slug,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  funil: FunilKanban;
  itens: ChamadoComPessoas[];
  ativa: boolean;
  slug: string;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-[260px] flex-1 flex-col rounded-2xl border bg-muted/40 transition-colors",
        ativa ? "border-primary bg-primary/5" : "border-border",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl"
        style={{
          background: `linear-gradient(to right, ${funil.cor}, transparent)`,
        }}
        aria-hidden
      />
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: funil.cor }}
            aria-hidden
          />
          <h3 className="truncate text-sm font-semibold uppercase tracking-wide text-foreground">
            {funil.nome}
          </h3>
          <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
            {itens.length}
          </span>
        </div>
        {funil.tipo === "status" && funil.status_origem && (
          <Link
            to="/w/$slug/chamados/novo"
            params={{ slug }}
            search={{ status: funil.status_origem }}
            aria-label={`Novo chamado em ${funil.nome}`}
            title={`Novo chamado em ${funil.nome}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="flex-1 space-y-2 px-2 pt-2 pb-3">
        {itens.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-xs text-muted-foreground">
            {funil.tipo === "status"
              ? "Arraste um chamado para cá"
              : "Nenhum chamado atende a este filtro"}
          </p>
        ) : (
          itens.map((c) => (
            <CartaoChamadoComPrevia
              key={c.id}
              chamado={c}
              slug={slug}
              onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
