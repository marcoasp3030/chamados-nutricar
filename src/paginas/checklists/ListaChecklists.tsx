import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, Loader2, Plus, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  useChecklists,
  useChecklistTemplates,
} from "@/hooks/useChecklists";
import { ITENS_TEMPLATE_PADRAO } from "@/utilitarios/templateChecklistPadrao";
import { obterUsuarioAtual } from "@/auth/atual";
import { dados } from "@/dados/atual";

export function ListaChecklists() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { data: checklists, isLoading } = useChecklists(workspaceAtual?.id);
  const { data: templates } = useChecklistTemplates(workspaceAtual?.id);
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [busca, setBusca] = useState("");

  const ehAdmin =
    workspaceAtual && ["Proprietario", "Administrador"].includes(workspaceAtual.papel);

  const semTemplate = (templates ?? []).length === 0;

  const criarTemplatePadrao = useMutation({
    mutationFn: async () => {
      const u = { user: await obterUsuarioAtual() };
      if (!u.user || !workspaceAtual) throw new Error("Sessão expirada");
      const { data: t, error } = await dados
        .from("checklist_templates")
        .insert({
          workspace_id: workspaceAtual.id,
          nome: "Implantação de Condomínio",
          descricao: "Modelo padrão para implantação de mini mercado em condomínio",
          padrao: true,
          criado_por: u.user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      const itens = ITENS_TEMPLATE_PADRAO.map((it, idx) => ({
        template_id: t.id,
        workspace_id: workspaceAtual.id,
        secao: it.secao,
        subsecao: it.subsecao ?? null,
        rotulo: it.rotulo,
        tipo: it.tipo,
        opcoes: it.opcoes ?? null,
        ordem: idx + 1,
      }));
      const { error: e2 } = await dados.from("checklist_template_itens").insert(itens);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Template padrão criado.");
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
    },
    onError: (e: Error) => toast.error("Falha ao criar template.", { description: e.message }),
  });

  const padrao = useMemo(
    () => (templates ?? []).find((t) => t.padrao) ?? (templates ?? [])[0],
    [templates],
  );

  const criar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe um nome.");
      const tplId = templateId || padrao?.id;
      if (!tplId) throw new Error("Crie um template antes.");
      const u = { user: await obterUsuarioAtual() };
      if (!u.user || !workspaceAtual) throw new Error("Sessão expirada");
      const { data, error } = await dados
        .from("checklists")
        .insert({
          workspace_id: workspaceAtual.id,
          template_id: tplId,
          nome: nome.trim(),
          criado_por: u.user.id,
          responsavel_id: u.user.id,
        })
        .select("id, workspace_id")
        .single();
      if (error) throw error;
      await dados.from("checklist_historico").insert({
        checklist_id: data.id,
        workspace_id: data.workspace_id,
        usuario_id: u.user.id,
        acao: "criou o checklist",
      });
    },
    onSuccess: () => {
      toast.success("Checklist criado.");
      setAberto(false);
      setNome("");
      setTemplateId("");
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
    },
    onError: (e: Error) => toast.error("Falha ao criar.", { description: e.message }),
  });

  if (!workspaceAtual) return null;

  const filtrados = (checklists ?? []).filter(
    (c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar checklists"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        {ehAdmin && (
          <Button asChild variant="outline">
            <Link to="/w/$slug/checklists/template" params={{ slug: workspaceAtual.slug }}>
              <Settings2 className="h-4 w-4" /> Editar template
            </Link>
          </Button>
        )}
        <Button onClick={() => setAberto(true)} disabled={semTemplate && !ehAdmin}>
          <Plus className="h-4 w-4" /> Novo checklist
        </Button>
      </div>

      {semTemplate ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <CheckSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="mb-4 text-sm text-muted-foreground">
            Nenhum template criado ainda.
          </p>
          {ehAdmin && (
            <Button
              onClick={() => criarTemplatePadrao.mutate()}
              disabled={criarTemplatePadrao.isPending}
            >
              {criarTemplatePadrao.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar template "Implantação de Condomínio"
            </Button>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <CheckSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Nenhum checklist encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => (
            <Link
              key={c.id}
              to="/w/$slug/checklists/$checklistId"
              params={{ slug: workspaceAtual.slug, checklistId: c.id }}
              className="group block rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-semibold group-hover:text-primary">{c.nome}</h3>
                <Badge variant="secondary">{c.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Criado {format(new Date(c.criado_em), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Condomínio Vista Verde"
              />
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateId || padrao?.id || ""} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(templates ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} {t.padrao && "· padrão"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
              {criar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
