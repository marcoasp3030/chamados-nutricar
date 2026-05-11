import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, FolderKanban, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useProjetos } from "@/hooks/useProjetos";
import { BadgeStatusProjeto } from "@/componentes/projetos/BadgeStatusProjeto";
import {
  FormularioProjeto,
  type DadosProjeto,
} from "@/componentes/projetos/FormularioProjeto";
import { STATUS_PROJETO, type StatusProjeto } from "@/tipos/projeto";
import { rotuloStatusProjeto } from "@/utilitarios/traducoes";
import { obterUsuarioAtual } from "@/auth/atual";

export function ListaProjetos() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useProjetos(workspaceAtual?.id);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusProjeto | "Todos">("Todos");

  const criar = useMutation({
    mutationFn: async (dados: DadosProjeto) => {
      const u = { user: await obterUsuarioAtual() };
      if (!u.user || !workspaceAtual) throw new Error("Sessão expirada");
      const { error } = await supabase.from("projetos").insert({
        workspace_id: workspaceAtual.id,
        nome: dados.nome,
        descricao: dados.descricao || null,
        status: dados.status,
        cor: dados.cor,
        inicio_em: dados.inicio_em,
        fim_previsto: dados.fim_previsto,
        responsavel_id: dados.responsavel_id,
        criado_por: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto criado.");
      setAberto(false);
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
    },
    onError: (e: Error) => toast.error("Falha ao criar.", { description: e.message }),
  });

  if (!workspaceAtual) return null;

  const filtrados = (data ?? []).filter((p) => {
    if (filtroStatus !== "Todos" && p.status !== filtroStatus) return false;
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as StatusProjeto | "Todos")}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os status</SelectItem>
            {STATUS_PROJETO.map((s) => (
              <SelectItem key={s} value={s}>{rotuloStatusProjeto[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4" /> Novo projeto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <FolderKanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Nenhum projeto encontrado. Crie o primeiro projeto da empresa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => {
            const pct =
              p.total_tarefas && p.total_tarefas > 0
                ? Math.round(((p.tarefas_concluidas ?? 0) / p.total_tarefas) * 100)
                : 0;
            return (
              <Link
                key={p.id}
                to="/w/$slug/projetos/$projetoId"
                params={{ slug: workspaceAtual.slug, projetoId: p.id }}
                className="group block rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: p.cor }}
                    />
                    <h3 className="font-semibold text-foreground group-hover:text-primary">
                      {p.nome}
                    </h3>
                  </div>
                  <BadgeStatusProjeto status={p.status} />
                </div>

                {p.descricao && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.descricao}</p>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span>
                      {p.tarefas_concluidas ?? 0} / {p.total_tarefas ?? 0}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${pct}%`, background: p.cor }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.responsavel?.nome ?? "Sem responsável"}</span>
                  {p.fim_previsto && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(p.fim_previsto), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo projeto</DialogTitle>
          </DialogHeader>
          <FormularioProjeto
            workspaceId={workspaceAtual.id}
            enviando={criar.isPending}
            aoCancelar={() => setAberto(false)}
            aoEnviar={(d) => criar.mutate(d)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
