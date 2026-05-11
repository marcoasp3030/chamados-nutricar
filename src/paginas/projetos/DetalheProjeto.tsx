import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useProjeto, useTarefasProjeto } from "@/hooks/useProjetos";
import { BadgeStatusProjeto } from "@/componentes/projetos/BadgeStatusProjeto";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import {
  FormularioProjeto,
  type DadosProjeto,
} from "@/componentes/projetos/FormularioProjeto";
import {
  FormularioTarefa,
  type DadosTarefa,
} from "@/componentes/projetos/FormularioTarefa";
import {
  STATUS_TAREFA,
  type StatusTarefa,
  type TarefaComPessoa,
} from "@/tipos/projeto";
import { rotuloStatusTarefa } from "@/utilitarios/traducoes";
import { cn } from "@/lib/utils";
import { obterUsuarioAtual } from "@/auth/atual";
import { dados } from "@/dados/atual";

interface Props {
  projetoId: string;
}

export function DetalheProjeto({ projetoId }: Props) {
  const { workspaceAtual } = useWorkspaceStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: projeto, isLoading } = useProjeto(projetoId);
  const { data: tarefas } = useTarefasProjeto(projetoId);
  const [editando, setEditando] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState<StatusTarefa | null>(null);
  const [editandoTarefa, setEditandoTarefa] = useState<TarefaComPessoa | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  const podeEditar =
    workspaceAtual && ["Proprietario", "Administrador", "Gestor", "Atendente"].includes(workspaceAtual.papel);
  const podeExcluir =
    workspaceAtual && ["Proprietario", "Administrador"].includes(workspaceAtual.papel);

  const colunas = useMemo(() => {
    const m = new Map<StatusTarefa, TarefaComPessoa[]>();
    STATUS_TAREFA.forEach((s) => m.set(s, []));
    (tarefas ?? []).forEach((t) => {
      if (m.has(t.status)) m.get(t.status)!.push(t);
    });
    return m;
  }, [tarefas]);

  const editar = useMutation({
    mutationFn: async (d: DadosProjeto) => {
      const { error } = await supabase
        .from("projetos")
        .update({
          nome: d.nome,
          descricao: d.descricao || null,
          status: d.status,
          cor: d.cor,
          inicio_em: d.inicio_em,
          fim_previsto: d.fim_previsto,
          responsavel_id: d.responsavel_id,
        })
        .eq("id", projetoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto atualizado.");
      setEditando(false);
      queryClient.invalidateQueries({ queryKey: ["projeto", projetoId] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
    },
    onError: (e: Error) => toast.error("Falha ao salvar.", { description: e.message }),
  });

  const excluirProjeto = useMutation({
    mutationFn: async () => {
      const { error } = await dados.from("projetos").delete().eq("id", projetoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto excluído.");
      if (workspaceAtual)
        navigate({ to: "/w/$slug/projetos", params: { slug: workspaceAtual.slug } });
    },
    onError: (e: Error) => toast.error("Falha ao excluir.", { description: e.message }),
  });

  const criarTarefa = useMutation({
    mutationFn: async (d: DadosTarefa) => {
      const u = { user: await obterUsuarioAtual() };
      if (!u.user || !projeto) throw new Error("Sessão expirada");
      const ordem = (tarefas ?? []).filter((t) => t.status === d.status).length;
      const { error } = await dados.from("tarefas").insert({
        projeto_id: projetoId,
        workspace_id: projeto.workspace_id,
        titulo: d.titulo,
        descricao: d.descricao || null,
        status: d.status,
        prioridade: d.prioridade,
        responsavel_id: d.responsavel_id,
        prazo: d.prazo,
        ordem,
        criado_por: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa criada.");
      setNovaTarefa(null);
      queryClient.invalidateQueries({ queryKey: ["tarefas", projetoId] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
    },
    onError: (e: Error) => toast.error("Falha ao criar.", { description: e.message }),
  });

  const editarTarefa = useMutation({
    mutationFn: async (vars: { id: string; dados: DadosTarefa }) => {
      const { error } = await supabase
        .from("tarefas")
        .update({
          titulo: vars.dados.titulo,
          descricao: vars.dados.descricao || null,
          status: vars.dados.status,
          prioridade: vars.dados.prioridade,
          responsavel_id: vars.dados.responsavel_id,
          prazo: vars.dados.prazo,
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa atualizada.");
      setEditandoTarefa(null);
      queryClient.invalidateQueries({ queryKey: ["tarefas", projetoId] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
    },
    onError: (e: Error) => toast.error("Falha ao salvar.", { description: e.message }),
  });

  const moverStatus = useMutation({
    mutationFn: async (vars: { id: string; status: StatusTarefa }) => {
      const { error } = await supabase
        .from("tarefas")
        .update({ status: vars.status })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", projetoId] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
    },
    onError: (e: Error) => toast.error("Falha ao mover.", { description: e.message }),
  });

  const excluirTarefa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await dados.from("tarefas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa excluída.");
      queryClient.invalidateQueries({ queryKey: ["tarefas", projetoId] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
    },
    onError: (e: Error) => toast.error("Falha ao excluir.", { description: e.message }),
  });

  if (!workspaceAtual) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h1 className="text-xl font-semibold">Projeto não encontrado</h1>
        <Button asChild className="mt-6">
          <Link to="/w/$slug/projetos" params={{ slug: workspaceAtual.slug }}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/w/$slug/projetos" params={{ slug: workspaceAtual.slug }}>
              <ArrowLeft className="h-4 w-4" /> Projetos
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: projeto.cor }} />
            <h1 className="text-2xl font-bold">{projeto.nome}</h1>
            <BadgeStatusProjeto status={projeto.status} />
          </div>
          {projeto.descricao && (
            <p className="max-w-3xl pt-1 text-sm text-muted-foreground">{projeto.descricao}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
            {projeto.responsavel && <span>Responsável: {projeto.responsavel.nome}</span>}
            {projeto.inicio_em && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Início: {format(new Date(projeto.inicio_em), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
            {projeto.fim_previsto && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Fim: {format(new Date(projeto.fim_previsto), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {podeEditar && (
            <Button variant="outline" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          )}
          {podeExcluir && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmarExcluir(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_TAREFA.map((status) => {
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
                <h3 className="text-sm font-semibold">{rotuloStatusTarefa[status]}</h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {itens.length}
                  </span>
                  {podeEditar && (
                    <button
                      onClick={() => setNovaTarefa(status)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                      aria-label="Nova tarefa"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {itens.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                    Sem tarefas
                  </p>
                ) : (
                  itens.map((t) => (
                    <div
                      key={t.id}
                      draggable={!!podeEditar}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                      onClick={() => podeEditar && setEditandoTarefa(t)}
                      className={cn(
                        "rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
                        podeEditar && "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <BadgePrioridade prioridade={t.prioridade} />
                        {podeEditar && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Excluir esta tarefa?")) excluirTarefa.mutate(t.id);
                            }}
                            className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="line-clamp-3 text-sm font-medium">{t.titulo}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t.responsavel?.nome ?? "—"}</span>
                        {t.prazo && (
                          <span>{format(new Date(t.prazo), "dd/MM", { locale: ptBR })}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar projeto</DialogTitle>
          </DialogHeader>
          <FormularioProjeto
            workspaceId={projeto.workspace_id}
            inicial={projeto}
            enviando={editar.isPending}
            rotuloEnvio="Salvar alterações"
            aoCancelar={() => setEditando(false)}
            aoEnviar={(d) => editar.mutate(d)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!novaTarefa} onOpenChange={(o) => !o && setNovaTarefa(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          {novaTarefa && (
            <FormularioTarefa
              workspaceId={projeto.workspace_id}
              inicial={{ status: novaTarefa }}
              enviando={criarTarefa.isPending}
              aoCancelar={() => setNovaTarefa(null)}
              aoEnviar={(d) => criarTarefa.mutate(d)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editandoTarefa} onOpenChange={(o) => !o && setEditandoTarefa(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tarefa</DialogTitle>
          </DialogHeader>
          {editandoTarefa && (
            <FormularioTarefa
              workspaceId={projeto.workspace_id}
              inicial={editandoTarefa}
              enviando={editarTarefa.isPending}
              rotuloEnvio="Salvar alterações"
              aoCancelar={() => setEditandoTarefa(null)}
              aoEnviar={(d) => editarTarefa.mutate({ id: editandoTarefa.id, dados: d })}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarExcluir} onOpenChange={setConfirmarExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as tarefas vinculadas serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => excluirProjeto.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
