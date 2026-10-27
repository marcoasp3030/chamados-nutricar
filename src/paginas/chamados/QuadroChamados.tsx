import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Loader2, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamadosQuadro } from "@/hooks/useChamados";
import { useUsuarioAtualId } from "@/auth/atual";
import { useFunisKanban, chamadoAtendeFunil, type FunilKanban } from "@/hooks/useFunisKanban";
import { CartaoChamadoComPrevia } from "@/componentes/chamados/CartaoChamadoComPrevia";
import { GerenciadorFunis } from "@/componentes/chamados/GerenciadorFunis";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { db } from "@/dados/atual";
import { rotuloStatusChamado } from "@/utilitarios/traducoes";
import { sinalizarNotificacoesWorkspace } from "@/lib/notificacoes-chamado";
import type { ChamadoComPessoas, StatusChamado } from "@/tipos/chamado";

export function QuadroChamados() {
  const { workspaceAtual } = useWorkspaceStore();
  const usuarioId = useUsuarioAtualId();
  const { data: chamados, isLoading, isFetching } = useChamadosQuadro(workspaceAtual?.id);
  const { data: funis = [] } = useFunisKanban(
    workspaceAtual?.id,
    usuarioId,
  );
  const queryClient = useQueryClient();
  const [colunaAtiva, setColunaAtiva] = useState<string | null>(null);
  // Por padrão o quadro não tem colunas para status encerrados (Fechado/Cancelado),
  // pois STATUS_KANBAN os exclui. Este toggle adiciona colunas "virtuais" para eles.
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);
  // Mudança de status por arrastar só é aplicada após confirmação explícita.
  const [movimentoPendente, setMovimentoPendente] = useState<{
    id: string;
    status: StatusChamado;
    funilNome: string;
  } | null>(null);

  // Funis exibidos = os do usuário + (opcional) colunas virtuais de encerrados.
  const funisExibidos = useMemo<FunilKanban[]>(() => {
    if (!mostrarEncerrados) return funis;
    const encerrados: StatusChamado[] = ["Fechado", "Cancelado"];
    const cores: Record<string, string> = { Fechado: "#64748b", Cancelado: "#ef4444" };
    const extras = encerrados
      .filter((s) => !funis.some((f) => f.tipo === "status" && f.status_origem === s))
      .map((s, i) => ({
        id: `__encerrado_${s}__`,
        workspace_id: workspaceAtual?.id ?? "",
        usuario_id: usuarioId ?? "",
        nome: rotuloStatusChamado[s],
        cor: cores[s],
        ordem: 1000 + i,
        tipo: "status" as const,
        status_origem: s,
        filtros: {},
        criado_em: "",
        atualizado_em: "",
      }));
    return [...funis, ...extras];
  }, [funis, mostrarEncerrados, workspaceAtual?.id, usuarioId]);

  const colunas = useMemo(() => {
    const mapa = new Map<string, ChamadoComPessoas[]>();
    funisExibidos.forEach((f) => mapa.set(f.id, []));
    (chamados ?? []).forEach((c) => {
      // primeiro funil que aceita o chamado
      for (const f of funisExibidos) {
        if (chamadoAtendeFunil(c as any, f)) {
          mapa.get(f.id)!.push(c);
          break;
        }
      }
    });
    return mapa;
  }, [chamados, funisExibidos]);

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
      setMovimentoPendente(null);
      if (workspaceAtual) void sinalizarNotificacoesWorkspace(workspaceAtual.id);
      toast.success("Status atualizado.");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível atualizar.", { description: e.message }),
  });

  const chamadoPendente = (chamados ?? []).find(
    (c) => c.id === movimentoPendente?.id,
  );

  if (!workspaceAtual) return null;

  const carregandoInicial = isLoading && !chamados?.length;

  if (carregandoInicial) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end gap-2 px-1">
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
        </div>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-[420px] animate-pulse rounded-2xl border border-border bg-muted/30"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isFetching && (
        <p className="px-1 text-xs text-muted-foreground">Atualizando quadro…</p>
      )}
      <div className="flex items-center justify-end gap-2 px-2">
        <Button
          variant={mostrarEncerrados ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setMostrarEncerrados((v) => !v)}
          title="Exibir colunas de chamados encerrados (Fechado/Cancelado)"
        >
          <Archive className="h-4 w-4" />
          {mostrarEncerrados ? "Ocultar encerrados" : "Mostrar encerrados"}
        </Button>
        {usuarioId && workspaceAtual && (
          <GerenciadorFunis workspaceId={workspaceAtual.id} usuarioId={usuarioId}>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" /> Gerenciar funis
            </Button>
          </GerenciadorFunis>
        )}
      </div>

      <div
        className="grid gap-2 pb-4 sm:gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.max(funisExibidos.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {funisExibidos.map((funil) => {
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
                  const chamado = (chamados ?? []).find((c) => c.id === id);
                  if (chamado && chamado.status === funil.status_origem) return;
                  setMovimentoPendente({
                    id,
                    status: funil.status_origem,
                    funilNome: funil.nome,
                  });
                } else {
                  toast.info("Este funil é filtrado — o status do chamado não foi alterado.");
                }
              }}
            />
          );
        })}
      </div>

      <Dialog
        open={!!movimentoPendente}
        onOpenChange={(o) => !o && !moverStatus.isPending && setMovimentoPendente(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar mudança de status</DialogTitle>
          </DialogHeader>
          {movimentoPendente && (
            <p className="text-sm text-muted-foreground">
              Mover{" "}
              <strong className="text-foreground">
                {chamadoPendente?.titulo ?? "o chamado"}
              </strong>{" "}
              para o status{" "}
              <strong className="text-foreground">
                {rotuloStatusChamado[movimentoPendente.status]}
              </strong>
              ?
            </p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMovimentoPendente(null)}
              disabled={moverStatus.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                movimentoPendente &&
                moverStatus.mutate({
                  id: movimentoPendente.id,
                  status: movimentoPendente.status,
                })
              }
              disabled={moverStatus.isPending}
            >
              {moverStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar e confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        "relative flex min-h-[420px] flex-col rounded-2xl border bg-muted/40 transition-colors",
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

      <div className="max-h-[calc(100vh-14rem)] flex-1 space-y-2 overflow-y-auto px-2 pt-2 pb-3">
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
