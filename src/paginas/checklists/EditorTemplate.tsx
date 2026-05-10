import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useChecklistTemplates,
  type ItemTemplate,
  type TipoItemChecklist,
} from "@/hooks/useChecklists";

const TIPOS: { v: TipoItemChecklist; r: string }[] = [
  { v: "checkbox", r: "Caixa de seleção" },
  { v: "sim_nao", r: "Sim / Não" },
  { v: "texto", r: "Texto curto" },
  { v: "textarea", r: "Texto longo" },
  { v: "select", r: "Lista (opções)" },
  { v: "data", r: "Data" },
  { v: "numero", r: "Número" },
];

export function EditorTemplate() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { data: templates } = useChecklistTemplates(workspaceAtual?.id);
  const padrao = useMemo(
    () => (templates ?? []).find((t) => t.padrao) ?? (templates ?? [])[0],
    [templates],
  );

  const ehAdmin =
    workspaceAtual && ["Proprietario", "Administrador"].includes(workspaceAtual.papel);

  const { data: itens, isLoading } = useQuery({
    queryKey: ["editor-template-itens", padrao?.id],
    enabled: !!padrao?.id,
    queryFn: async (): Promise<ItemTemplate[]> => {
      const { data, error } = await supabase
        .from("checklist_template_itens")
        .select("*")
        .eq("template_id", padrao!.id)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as ItemTemplate[];
    },
  });

  const [aberto, setAberto] = useState(false);
  const [novoRotulo, setNovoRotulo] = useState("");
  const [novaSecao, setNovaSecao] = useState("");
  const [novaSub, setNovaSub] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoItemChecklist>("checkbox");
  const [novaOpcoes, setNovaOpcoes] = useState("");

  const adicionar = useMutation({
    mutationFn: async () => {
      if (!padrao || !workspaceAtual) throw new Error("Sem template");
      if (!novoRotulo.trim() || !novaSecao.trim()) throw new Error("Preencha seção e rótulo");
      const ordem = (itens?.length ?? 0) + 1;
      const opcoes =
        novoTipo === "select" && novaOpcoes
          ? novaOpcoes.split(",").map((s) => s.trim()).filter(Boolean)
          : null;
      const { error } = await supabase.from("checklist_template_itens").insert({
        template_id: padrao.id,
        workspace_id: workspaceAtual.id,
        secao: novaSecao.trim(),
        subsecao: novaSub.trim() || null,
        rotulo: novoRotulo.trim(),
        tipo: novoTipo,
        opcoes,
        ordem,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item adicionado.");
      setAberto(false);
      setNovoRotulo("");
      setNovaSub("");
      setNovaOpcoes("");
      queryClient.invalidateQueries({ queryKey: ["editor-template-itens"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-itens-template"] });
    },
    onError: (e: Error) => toast.error("Falha.", { description: e.message }),
  });

  const alterarAtivo = useMutation({
    mutationFn: async (vars: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("checklist_template_itens")
        .update({ ativo: vars.ativo })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-template-itens"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-itens-template"] });
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklist_template_itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removido.");
      queryClient.invalidateQueries({ queryKey: ["editor-template-itens"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-itens-template"] });
    },
    onError: (e: Error) => toast.error("Falha.", { description: e.message }),
  });

  const grupos = useMemo(() => {
    const m = new Map<string, ItemTemplate[]>();
    for (const it of itens ?? []) {
      if (!m.has(it.secao)) m.set(it.secao, []);
      m.get(it.secao)!.push(it);
    }
    return m;
  }, [itens]);

  if (!workspaceAtual) return null;
  if (!ehAdmin) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Apenas administradores podem editar o template.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/w/$slug/checklists" params={{ slug: workspaceAtual.slug }}>
              <ArrowLeft className="h-4 w-4" /> Checklists
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Editar template</h1>
          <p className="text-sm text-muted-foreground">
            {padrao ? padrao.nome : "Nenhum template"}
          </p>
        </div>
        <Button onClick={() => setAberto(true)} disabled={!padrao}>
          <Plus className="h-4 w-4" /> Novo item
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grupos.entries()).map(([secao, lista]) => (
            <section key={secao} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">{secao}</h2>
              <div className="space-y-1">
                {lista.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background/30 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={!it.ativo ? "line-through text-muted-foreground" : ""}>
                        {it.subsecao && (
                          <span className="text-xs text-muted-foreground">{it.subsecao} · </span>
                        )}
                        {it.rotulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TIPOS.find((t) => t.v === it.tipo)?.r ?? it.tipo}
                        {it.opcoes && ` · ${it.opcoes.join(", ")}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alterarAtivo.mutate({ id: it.id, ativo: !it.ativo })}
                    >
                      {it.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Remover este item?")) excluir.mutate(it.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Seção</Label>
              <Input
                value={novaSecao}
                onChange={(e) => setNovaSecao(e.target.value)}
                list="lista-secoes"
              />
              <datalist id="lista-secoes">
                {Array.from(grupos.keys()).map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Subseção (opcional)</Label>
              <Input value={novaSub} onChange={(e) => setNovaSub(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Rótulo</Label>
              <Input value={novoRotulo} onChange={(e) => setNovoRotulo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as TipoItemChecklist)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.v} value={t.v}>{t.r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {novoTipo === "select" && (
              <div className="space-y-2">
                <Label>Opções (separadas por vírgula)</Label>
                <Input
                  value={novaOpcoes}
                  onChange={(e) => setNovaOpcoes(e.target.value)}
                  placeholder="Opção 1, Opção 2, Opção 3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={() => adicionar.mutate()} disabled={adicionar.isPending}>
              {adicionar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
