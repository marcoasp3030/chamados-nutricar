import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamados } from "@/hooks/useChamados";
import { CartaoChamado } from "@/componentes/chamados/CartaoChamado";
import { STATUS_KANBAN, type StatusChamado, type ChamadoComPessoas } from "@/tipos/chamado";
import { rotuloStatusChamado } from "@/utilitarios/traducoes";
import { cn } from "@/lib/utils";

const corColuna: Record<StatusChamado, { ponto: string; topo: string }> = {
  Aberto: { ponto: "bg-blue-500", topo: "from-blue-500/60" },
  "Em andamento": { ponto: "bg-amber-500", topo: "from-amber-500/60" },
  "Aguardando solicitante": { ponto: "bg-purple-500", topo: "from-purple-500/60" },
  "Aguardando terceiros": { ponto: "bg-pink-500", topo: "from-pink-500/60" },
  Resolvido: { ponto: "bg-emerald-500", topo: "from-emerald-500/60" },
  Fechado: { ponto: "bg-slate-500", topo: "from-slate-500/60" },
  Cancelado: { ponto: "bg-red-500", topo: "from-red-500/60" },
};

export function QuadroChamados() {
  const { workspaceAtual } = useWorkspaceStore();
  const { data, isLoading } = useChamados(workspaceAtual?.id, { somenteRaiz: true });
  const queryClient = useQueryClient();
  const [colunaAtiva, setColunaAtiva] = useState<StatusChamado | null>(null);

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
    <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4 xl:gap-4">
      {STATUS_KANBAN.map((status) => {
        const itens = colunas.get(status) ?? [];
        const cores = corColuna[status];
        const ativa = colunaAtiva === status;
        return (
          <div
            key={status}
            className={cn(
              "relative flex min-w-[260px] flex-1 flex-col rounded-2xl border bg-muted/40 transition-colors",
              ativa ? "border-primary bg-primary/5" : "border-border",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setColunaAtiva(status);
            }}
            onDragLeave={() => setColunaAtiva((s) => (s === status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setColunaAtiva(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) moverStatus.mutate({ id, status });
            }}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r to-transparent",
                cores.topo,
              )}
              aria-hidden
            />
            <div className="flex items-center justify-between px-3 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", cores.ponto)} aria-hidden />
                <h3 className="text-sm font-semibold">{rotuloStatusChamado[status]}</h3>
              </div>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {itens.length}
              </span>
            </div>

            <div className="flex-1 space-y-2 px-2 pb-3">
              {itens.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-xs text-muted-foreground">
                  Solte aqui ou nenhum chamado
                </p>
              ) : (
                itens.map((c) => (
                  <CartaoChamado
                    key={c.id}
                    chamado={c}
                    slug={workspaceAtual.slug}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
