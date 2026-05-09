import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Pencil,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamadoPorNumero } from "@/hooks/useChamado";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import { ComentariosChamado } from "@/componentes/chamados/ComentariosChamado";
import { HistoricoChamado } from "@/componentes/chamados/HistoricoChamado";
import { ArvoreSubchamados } from "@/componentes/chamados/ArvoreSubchamados";
import {
  FormularioChamado,
  type DadosFormularioChamado,
} from "@/componentes/chamados/FormularioChamado";
import { NovoChamado } from "./NovoChamado";
import {
  STATUS_CHAMADO,
  type StatusChamado,
} from "@/tipos/chamado";
import { rotuloStatusChamado, rotuloTipoChamado } from "@/utilitarios/traducoes";

interface Props {
  numero: number;
}

export function DetalheChamado({ numero }: Props) {
  const { workspaceAtual } = useWorkspaceStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: chamado, isLoading } = useChamadoPorNumero(workspaceAtual?.id, numero);
  const { data: membros } = useMembrosWorkspace(workspaceAtual?.id);
  const [editando, setEditando] = useState(false);
  const [novoSub, setNovoSub] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  const podeAtender =
    workspaceAtual && ["Proprietario", "Administrador", "Gestor", "Atendente"].includes(workspaceAtual.papel);
  const podeExcluir =
    workspaceAtual && ["Proprietario", "Administrador"].includes(workspaceAtual.papel);

  const atualizar = useMutation({
    mutationFn: async (campos: Record<string, unknown>) => {
      if (!chamado) throw new Error("Chamado não carregado");
      const { error } = await supabase.from("chamados").update(campos).eq("id", chamado.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamado", workspaceAtual?.id, numero] });
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
      queryClient.invalidateQueries({ queryKey: ["historico", chamado?.id] });
    },
    onError: (e: Error) => toast.error("Falha ao atualizar.", { description: e.message }),
  });

  const editar = useMutation({
    mutationFn: async (dados: DadosFormularioChamado) => {
      if (!chamado) throw new Error("Chamado não carregado");
      const { error } = await supabase
        .from("chamados")
        .update({
          titulo: dados.titulo,
          descricao: dados.descricao || null,
          tipo: dados.tipo,
          prioridade: dados.prioridade,
          status: dados.status,
          categoria: dados.categoria || null,
          responsavel_id: dados.responsavel_id,
          prazo: dados.prazo,
        })
        .eq("id", chamado.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamado", workspaceAtual?.id, numero] });
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
      queryClient.invalidateQueries({ queryKey: ["historico", chamado?.id] });
      setEditando(false);
      toast.success("Chamado atualizado.");
    },
    onError: (e: Error) => toast.error("Falha ao salvar.", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async () => {
      if (!chamado) return;
      const { error } = await supabase.from("chamados").delete().eq("id", chamado.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado excluído.");
      if (workspaceAtual)
        navigate({ to: "/w/$slug/chamados", params: { slug: workspaceAtual.slug } });
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

  if (!chamado) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h1 className="text-xl font-semibold">Chamado não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O chamado #{numero} não existe ou você não tem acesso.
        </p>
        <Button asChild className="mt-6">
          <Link to="/w/$slug/chamados" params={{ slug: workspaceAtual.slug }}>
            <ArrowLeft className="h-4 w-4" /> Voltar para chamados
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
            <Link to="/w/$slug/chamados" params={{ slug: workspaceAtual.slug }}>
              <ArrowLeft className="h-4 w-4" /> Chamados
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">#{chamado.numero}</span>
            <h1 className="text-2xl font-bold">{chamado.titulo}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <BadgeStatus status={chamado.status} />
            <BadgePrioridade prioridade={chamado.prioridade} />
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {rotuloTipoChamado[chamado.tipo]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {podeAtender && (
            <Select
              value={chamado.status}
              onValueChange={(v) => atualizar.mutate({ status: v as StatusChamado })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CHAMADO.map((s) => (
                  <SelectItem key={s} value={s}>
                    {rotuloStatusChamado[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => setEditando(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Descrição</h2>
            {chamado.descricao ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">{chamado.descricao}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem descrição.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <ArvoreSubchamados
              chamadoPaiId={chamado.id}
              slug={workspaceAtual.slug}
              aoCriarSubchamado={() => setNovoSub(true)}
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <Tabs defaultValue="comentarios">
              <TabsList>
                <TabsTrigger value="comentarios">Comentários</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="comentarios" className="pt-4">
                <ComentariosChamado
                  chamadoId={chamado.id}
                  workspaceId={chamado.workspace_id}
                  podeUsarInterno={!!podeAtender}
                />
              </TabsContent>
              <TabsContent value="historico" className="pt-4">
                <HistoricoChamado chamadoId={chamado.id} />
              </TabsContent>
            </Tabs>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Detalhes</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Solicitante</dt>
                  <dd>{chamado.solicitante?.nome ?? "—"}</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <dt className="text-xs text-muted-foreground">Responsável</dt>
                  <dd>
                    {podeAtender ? (
                      <Select
                        value={chamado.responsavel_id ?? "__nenhum__"}
                        onValueChange={(v) =>
                          atualizar.mutate({
                            responsavel_id: v === "__nenhum__" ? null : v,
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Sem responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__nenhum__">Sem responsável</SelectItem>
                          {(membros ?? []).map((m) => (
                            <SelectItem key={m.usuario_id} value={m.usuario_id}>
                              {m.perfil.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      chamado.responsavel?.nome ?? "Sem responsável"
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Criado em</dt>
                  <dd>
                    {format(new Date(chamado.criado_em), "dd 'de' MMM yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </dd>
                </div>
              </div>
              {chamado.prazo && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Prazo</dt>
                    <dd>
                      {format(new Date(chamado.prazo), "dd 'de' MMM yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </dd>
                  </div>
                </div>
              )}
              {chamado.categoria && (
                <div>
                  <dt className="text-xs text-muted-foreground">Categoria</dt>
                  <dd>{chamado.categoria}</dd>
                </div>
              )}
              {chamado.chamado_pai_id && (
                <div>
                  <dt className="text-xs text-muted-foreground">Chamado pai</dt>
                  <dd className="text-primary">Vinculado a um chamado superior</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar chamado #{chamado.numero}</DialogTitle>
          </DialogHeader>
          <FormularioChamado
            workspaceId={chamado.workspace_id}
            inicial={chamado}
            permiteEditarStatus={!!podeAtender}
            enviando={editar.isPending}
            rotuloEnvio="Salvar alterações"
            aoCancelar={() => setEditando(false)}
            aoEnviar={(dados) => editar.mutate(dados)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={novoSub} onOpenChange={setNovoSub}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo subchamado de #{chamado.numero}</DialogTitle>
          </DialogHeader>
          <NovoChamadoEmbutido
            chamadoPaiId={chamado.id}
            aoFinalizar={() => {
              setNovoSub(false);
              queryClient.invalidateQueries({ queryKey: ["subchamados", chamado.id] });
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarExcluir} onOpenChange={setConfirmarExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o chamado, comentários, anexos e subchamados vinculados. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => excluir.mutate()}
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

// Versão embutida do formulário de novo chamado para subchamados (sem layout/header)
function NovoChamadoEmbutido({
  chamadoPaiId,
  aoFinalizar,
}: {
  chamadoPaiId: string;
  aoFinalizar: () => void;
}) {
  const { workspaceAtual } = useWorkspaceStore();

  const criar = useMutation({
    mutationFn: async (dados: DadosFormularioChamado) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !workspaceAtual) throw new Error("Sessão expirada");
      const { error } = await supabase.from("chamados").insert({
        workspace_id: workspaceAtual.id,
        titulo: dados.titulo,
        descricao: dados.descricao || null,
        tipo: dados.tipo,
        prioridade: dados.prioridade,
        status: "Aberto",
        categoria: dados.categoria || null,
        responsavel_id: dados.responsavel_id,
        prazo: dados.prazo,
        chamado_pai_id: chamadoPaiId,
        solicitante_id: u.user.id,
        criado_por: u.user.id,
        numero: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subchamado criado.");
      aoFinalizar();
    },
    onError: (e: Error) => toast.error("Falha ao criar.", { description: e.message }),
  });

  if (!workspaceAtual) return null;

  return (
    <FormularioChamado
      workspaceId={workspaceAtual.id}
      chamadoPaiId={chamadoPaiId}
      enviando={criar.isPending}
      rotuloEnvio="Criar subchamado"
      aoCancelar={aoFinalizar}
      aoEnviar={(dados) => criar.mutate(dados)}
    />
  );
}
