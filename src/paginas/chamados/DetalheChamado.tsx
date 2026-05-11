import { useEffect, useState } from "react";
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
  UserPlus,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { LinhaTempoChamado } from "@/componentes/chamados/LinhaTempoChamado";
import { AnexosChamado } from "@/componentes/chamados/AnexosChamado";
import { RequisicaoCompras } from "@/componentes/chamados/RequisicaoCompras";
import { ArvoreSubchamados } from "@/componentes/chamados/ArvoreSubchamados";
import { AcoesIAChamado } from "@/componentes/chamados/AcoesIAChamado";
import { HistoricoIAChamado } from "@/componentes/chamados/HistoricoIAChamado";
import { NotificacoesWhatsappChamado } from "@/componentes/chamados/NotificacoesWhatsappChamado";
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
import { obterUsuarioAtual, obterUsuarioAtualId } from "@/auth/atual";
import { storage } from "@/storage/atual";
import { db } from "@/dados/atual";

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
  const [transicao, setTransicao] = useState<StatusChamado | null>(null);
  const [motivoTexto, setMotivoTexto] = useState("");
  const [agendadoPara, setAgendadoPara] = useState("");
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  useEffect(() => {
    obterUsuarioAtualId().then(setUsuarioId);
  }, []);

  const podeAtender =
    workspaceAtual && ["Proprietario", "Administrador", "Gestor", "Atendente"].includes(workspaceAtual.papel);
  const podeExcluir =
    workspaceAtual && ["Proprietario", "Administrador"].includes(workspaceAtual.papel);

  const meuMembro = (membros ?? []).find((m) => m.usuario_id === usuarioId);
  const meusDeptoIds = meuMembro?.departamento_ids ?? [];
  const ehDoDeptoDestino =
    !!chamado?.departamento_id && meusDeptoIds.includes(chamado.departamento_id);
  const podeAssumir =
    !!usuarioId && ehDoDeptoDestino && chamado?.responsavel_id !== usuarioId;

  const atualizar = useMutation({
    mutationFn: async (campos: Partial<{
      status: StatusChamado;
      responsavel_id: string | null;
      motivo_agendamento: string | null;
      agendado_para: string | null;
      motivo_pausa: string | null;
      tratativa: string | null;
    }>) => {
      if (!chamado) throw new Error("Chamado não carregado");
      const { error } = await db.from("chamados").update(campos).eq("id", chamado.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamado", workspaceAtual?.id, numero] });
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
      queryClient.invalidateQueries({ queryKey: ["historico", chamado?.id] });
    },
    onError: (e: Error) => toast.error("Falha ao atualizar.", { description: e.message }),
  });

  function iniciarTransicao(novo: StatusChamado) {
    if (!chamado || novo === chamado.status) return;
    if (
      chamado.status === "Aberto" &&
      !["Aberto", "Cancelado", "Fechado"].includes(novo) &&
      !chamado.responsavel_id
    ) {
      toast.error("Atribua um responsável antes de iniciar a resolução.", {
        description: ehDoDeptoDestino
          ? "Use o botão 'Atribuir a mim' ou selecione um responsável."
          : undefined,
      });
      return;
    }
    if (novo === "Agendado" || novo === "Pausado" || novo === "Resolvido") {
      setMotivoTexto("");
      setAgendadoPara("");
      setTransicao(novo);
      return;
    }
    atualizar.mutate({ status: novo });
  }

  function confirmarTransicao() {
    if (!transicao) return;
    if (transicao === "Agendado") {
      if (!motivoTexto.trim()) return toast.error("Informe o motivo do agendamento.");
      if (!agendadoPara) return toast.error("Informe a data do agendamento.");
      atualizar.mutate({
        status: "Agendado",
        motivo_agendamento: motivoTexto.trim(),
        agendado_para: new Date(agendadoPara).toISOString(),
      });
    } else if (transicao === "Pausado") {
      if (!motivoTexto.trim()) return toast.error("Informe o motivo da pausa.");
      atualizar.mutate({ status: "Pausado", motivo_pausa: motivoTexto.trim() });
    } else if (transicao === "Resolvido") {
      if (!motivoTexto.trim()) return toast.error("Descreva a tratativa realizada.");
      atualizar.mutate({ status: "Resolvido", tratativa: motivoTexto.trim() });
    }
    setTransicao(null);
  }

  function assumirChamado() {
    if (!usuarioId) return;
    atualizar.mutate(
      { responsavel_id: usuarioId },
      { onSuccess: () => toast.success("Chamado atribuído a você.") },
    );
  }

  const editar = useMutation({
    mutationFn: async (dados: DadosFormularioChamado) => {
      if (!chamado) throw new Error("Chamado não carregado");
      const { error } = await dados
        .from("chamados")
        .update({
          titulo: dados.titulo,
          descricao: dados.descricao || null,
          tipo: dados.tipo,
          prioridade: dados.prioridade,
          status: dados.status,
          categoria: dados.categoria || null,
          loja: dados.loja,
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
      const { error } = await db.from("chamados").delete().eq("id", chamado.id);
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
            <span className="font-mono text-sm text-muted-foreground">{chamado.codigo ?? `#${chamado.numero}`}</span>
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
          {podeAssumir && (
            <Button variant="default" size="sm" onClick={assumirChamado} disabled={atualizar.isPending}>
              <UserPlus className="h-4 w-4" />
              {chamado.responsavel_id ? "Reassumir chamado" : "Atribuir a mim"}
            </Button>
          )}
          {(podeAtender || ehDoDeptoDestino) && (
            <Select
              value={chamado.status}
              onValueChange={(v) => iniciarTransicao(v as StatusChamado)}
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
          {podeAtender && (
            <AcoesIAChamado workspaceId={chamado.workspace_id} chamadoId={chamado.id} />
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

      {/* Banners contextuais de tratativa / motivos */}
      {(chamado.status === "Agendado" && chamado.motivo_agendamento) && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm dark:border-indigo-900 dark:bg-indigo-950/40">
          <p className="font-semibold text-indigo-900 dark:text-indigo-100">Agendado</p>
          <p className="mt-1 text-indigo-900/80 dark:text-indigo-100/80">{chamado.motivo_agendamento}</p>
          {chamado.agendado_para && (
            <p className="mt-1 text-xs text-indigo-900/70 dark:text-indigo-100/70">
              Para {format(new Date(chamado.agendado_para), "dd 'de' MMM yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      )}
      {(chamado.status === "Pausado" && chamado.motivo_pausa) && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm dark:border-yellow-900 dark:bg-yellow-950/40">
          <p className="font-semibold text-yellow-900 dark:text-yellow-100">Pausado</p>
          <p className="mt-1 text-yellow-900/80 dark:text-yellow-100/80">{chamado.motivo_pausa}</p>
        </div>
      )}
      {(chamado.status === "Resolvido" || chamado.status === "Fechado") && chamado.tratativa && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">Tratativa realizada</p>
          <p className="mt-1 whitespace-pre-wrap text-emerald-900/80 dark:text-emerald-100/80">{chamado.tratativa}</p>
        </div>
      )}

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

          {(chamado as unknown as { requisicao_compras?: boolean }).requisicao_compras && (
            <RequisicaoCompras
              chamadoId={chamado.id}
              codigoChamado={chamado.codigo ?? `#${chamado.numero}`}
              tituloChamado={chamado.titulo}
            />
          )}

          <section className="rounded-2xl border border-border bg-card p-5">
            <ArvoreSubchamados
              chamadoPaiId={chamado.id}
              slug={workspaceAtual.slug}
              aoCriarSubchamado={() => setNovoSub(true)}
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <Tabs defaultValue="linha-tempo">
              <TabsList>
                <TabsTrigger value="linha-tempo">Linha do tempo</TabsTrigger>
                <TabsTrigger value="comentarios">Comentários</TabsTrigger>
                <TabsTrigger value="anexos">Anexos</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="ia">IA</TabsTrigger>
                {podeExcluir && <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>}
              </TabsList>
              <TabsContent value="linha-tempo" className="pt-4">
                <LinhaTempoChamado chamadoId={chamado.id} numeroPrincipal={chamado.numero} />
              </TabsContent>
              <TabsContent value="comentarios" className="pt-4">
                <ComentariosChamado
                  chamadoId={chamado.id}
                  workspaceId={chamado.workspace_id}
                  podeUsarInterno={!!podeAtender}
                />
              </TabsContent>
              <TabsContent value="anexos" className="pt-4">
                <AnexosChamado
                  chamadoId={chamado.id}
                  workspaceId={chamado.workspace_id}
                  podeExcluirTodos={!!podeExcluir}
                />
              </TabsContent>
              <TabsContent value="historico" className="pt-4">
                <HistoricoChamado chamadoId={chamado.id} />
              </TabsContent>
              <TabsContent value="ia" className="pt-4">
                <HistoricoIAChamado chamadoId={chamado.id} />
              </TabsContent>
              {podeExcluir && (
                <TabsContent value="whatsapp" className="pt-4">
                  <NotificacoesWhatsappChamado chamadoId={chamado.id} />
                </TabsContent>
              )}
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

      <Dialog open={!!transicao} onOpenChange={(o) => !o && setTransicao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transicao === "Agendado" && "Agendar chamado"}
              {transicao === "Pausado" && "Pausar chamado"}
              {transicao === "Resolvido" && "Resolver chamado"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {transicao === "Agendado" && (
              <div className="space-y-2">
                <Label htmlFor="agendado-data">Data e hora do agendamento *</Label>
                <Input
                  id="agendado-data"
                  type="datetime-local"
                  value={agendadoPara}
                  onChange={(e) => setAgendadoPara(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="motivo-texto">
                {transicao === "Resolvido" ? "Tratativa realizada *" : "Motivo *"}
              </Label>
              <Textarea
                id="motivo-texto"
                rows={transicao === "Resolvido" ? 6 : 4}
                value={motivoTexto}
                onChange={(e) => setMotivoTexto(e.target.value)}
                placeholder={
                  transicao === "Agendado"
                    ? "Por que este chamado precisa ser agendado?"
                    : transicao === "Pausado"
                    ? "Por que o chamado está sendo pausado?"
                    : "Descreva como o chamado foi resolvido."
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTransicao(null)}>Cancelar</Button>
            <Button onClick={confirmarTransicao} disabled={atualizar.isPending}>
              {atualizar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar chamado {chamado.codigo ?? `#${chamado.numero}`}</DialogTitle>
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
            <DialogTitle>Novo subchamado de {chamado.codigo ?? `#${chamado.numero}`}</DialogTitle>
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
      const u = { user: await obterUsuarioAtual() };
      if (!u.user || !workspaceAtual) throw new Error("Sessão expirada");
      const { data: novo, error } = await dados
        .from("chamados")
        .insert({
          workspace_id: workspaceAtual.id,
          titulo: dados.titulo,
          descricao: dados.descricao || null,
          tipo: dados.tipo,
          prioridade: dados.prioridade,
          status: "Aberto",
          categoria: dados.categoria || null,
          loja: dados.loja,
          responsavel_id: dados.responsavel_id,
          prazo: dados.prazo,
          chamado_pai_id: chamadoPaiId,
          solicitante_id: u.user.id,
          criado_por: u.user.id,
          numero: 0,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (dados.anexos.length > 0) {
        const falhas: string[] = [];
        for (const arquivo of dados.anexos) {
          const nomeSeguro = arquivo.name.replace(/[^\w.\-]+/g, "_");
          const caminho = `${workspaceAtual.id}/${novo.id}/${crypto.randomUUID()}-${nomeSeguro}`;
          const up = await storage.from("chamado-anexos")
            .upload(caminho, arquivo, { contentType: arquivo.type || undefined });
          if (up.error) {
            falhas.push(arquivo.name);
            continue;
          }
          const ins = await db.from("chamado_anexos").insert({
            workspace_id: workspaceAtual.id,
            chamado_id: novo.id,
            enviado_por: u.user.id,
            nome_arquivo: arquivo.name,
            caminho_storage: caminho,
            tipo_mime: arquivo.type || null,
            tamanho_bytes: arquivo.size,
          });
          if (ins.error) falhas.push(arquivo.name);
        }
        if (falhas.length > 0) toast.warning(`Alguns anexos falharam: ${falhas.join(", ")}`);
      }
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
