import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamados } from "@/hooks/useChamados";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import { STATUS_KANBAN, type StatusChamado, type ChamadoComPessoas } from "@/tipos/chamado";
import { rotuloStatusChamado } from "@/utilitarios/traducoes";
import { cn } from "@/lib/utils";

export function QuadroChamados() {
  const { workspaceAtual } = useWorkspaceStore();
  const { data, isLoading } = useChamados(workspaceAtual?.id, { somenteRaiz: true });
  const queryClient = useQueryClient();

  const colunas = useMemo(() => {
    const mapa = new Map<StatusChamado, ChamadoComPessoas[]>();
    STATUS_KANBAN.forEach((s) => mapa.set(s, []));
    (data ?? []).forEach((c) => {
      if (mapa.has(c.status)) mapa.get(c.status)!.push(c);
    });
    return mapa;
  }, [data]);

  const moverStatus = useMutation({
    mutationFn: async (vars: { id: string; status: StatusChamado }) => {
      const { error } = await supabase
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_KANBAN.map((status) => {
        const itens = colunas.get(status) ?? [];
        return (
          <div
            key={status}
            className="w-[300px] flex-shrink-0 rounded-2xl border border-border bg-muted/30 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) moverStatus.mutate({ id, status });
            }}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{rotuloStatusChamado[status]}</h3>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {itens.length}
              </span>
            </div>
            <div className="space-y-2">
              {itens.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum chamado
                </p>
              ) : (
                itens.map((c) => (
                  <Link
                    key={c.id}
                    to="/w/$slug/chamados/$numero"
                    params={{ slug: workspaceAtual.slug, numero: String(c.numero) }}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                    className={cn(
                      "block cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">#{c.numero}</span>
                      <BadgePrioridade prioridade={c.prioridade} />
                    </div>
                    <p className="line-clamp-3 text-sm font-medium">{c.titulo}</p>
                    {c.responsavel && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {c.responsavel.nome}
                      </p>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
