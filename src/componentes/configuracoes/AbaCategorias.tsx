import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { obterUsuarioAtual } from "@/auth/atual";
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
import { db } from "@/dados/atual";

export interface CategoriaChamado {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  workspace_id: string;
  criado_em: string;
  sla_resposta_horas: number | null;
  sla_resolucao_horas: number | null;
}

const slaSchema = z
  .union([z.string().trim().length(0), z.coerce.number().int().min(0).max(8760)])
  .optional();

const categoriaSchema = z.object({
  nome: z.string().trim().min(2, "Mínimo de 2 caracteres").max(60, "Máximo de 60 caracteres"),
  descricao: z.string().trim().max(300).optional().or(z.literal("")),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  sla_resposta_horas: slaSchema,
  sla_resolucao_horas: slaSchema,
});

export function useCategoriasChamado(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["categorias-chamado", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<CategoriaChamado[]> => {
      const { data, error } = await db
        .from("categorias_chamado")
        .select("id, nome, descricao, cor, workspace_id, criado_em, sla_resposta_horas, sla_resolucao_horas")
        .eq("workspace_id", workspaceId!)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function AbaCategorias() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCategoriasChamado(workspaceAtual?.id);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<CategoriaChamado | null>(null);
  const [confirmarRemover, setConfirmarRemover] = useState<CategoriaChamado | null>(null);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    cor: "#88BE46",
    sla_resposta_horas: "",
    sla_resolucao_horas: "",
  });
  const [erros, setErros] = useState<{
    nome?: string;
    descricao?: string;
    cor?: string;
    sla_resposta_horas?: string;
    sla_resolucao_horas?: string;
  }>({});

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", descricao: "", cor: "#88BE46", sla_resposta_horas: "", sla_resolucao_horas: "" });
    setErros({});
    setAberto(true);
  }

  function abrirEdicao(c: CategoriaChamado) {
    setEditando(c);
    setForm({
      nome: c.nome,
      descricao: c.descricao ?? "",
      cor: c.cor,
      sla_resposta_horas: c.sla_resposta_horas != null ? String(c.sla_resposta_horas) : "",
      sla_resolucao_horas: c.sla_resolucao_horas != null ? String(c.sla_resolucao_horas) : "",
    });
    setErros({});
    setAberto(true);
  }

  const salvar = useMutation({
    mutationFn: async () => {
      const parse = categoriaSchema.safeParse(form);
      if (!parse.success) {
        const flat = parse.error.flatten().fieldErrors;
        setErros({
          nome: flat.nome?.[0],
          descricao: flat.descricao?.[0],
          cor: flat.cor?.[0],
          sla_resposta_horas: flat.sla_resposta_horas?.[0],
          sla_resolucao_horas: flat.sla_resolucao_horas?.[0],
        });
        throw new Error("Verifique os campos");
      }
      if (!workspaceAtual) throw new Error("Workspace inválido");
      const u = { user: await obterUsuarioAtual() };
      if (!u.user) throw new Error("Sessão expirada");

      const toIntOrNull = (v: unknown) =>
        typeof v === "number" && !Number.isNaN(v) ? v : null;

      const payload = {
        nome: parse.data.nome,
        descricao: parse.data.descricao || null,
        cor: parse.data.cor,
        sla_resposta_horas: toIntOrNull(parse.data.sla_resposta_horas),
        sla_resolucao_horas: toIntOrNull(parse.data.sla_resolucao_horas),
      };

      if (editando) {
        const { error } = await db
          .from("categorias_chamado")
          .update(payload)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("categorias_chamado").insert({
          ...payload,
          workspace_id: workspaceAtual.id,
          criado_por: u.user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-chamado"] });
      toast.success(editando ? "Categoria atualizada." : "Categoria criada.");
      setAberto(false);
    },
    onError: (e: Error) => {
      if (e.message !== "Verifique os campos") {
        toast.error("Não foi possível salvar.", { description: e.message });
      }
    },
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("categorias_chamado").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-chamado"] });
      toast.success("Categoria removida.");
      setConfirmarRemover(null);
    },
    onError: (e: Error) =>
      toast.error("Não foi possível remover.", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Categorias de chamados</h2>
          <p className="text-sm text-muted-foreground">
            Defina categorias para classificar os chamados da sua empresa.
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4" /> Nova categoria
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Tag className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria cadastrada.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: c.cor }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.nome}</p>
                    {c.descricao && (
                      <p className="truncate text-xs text-muted-foreground">{c.descricao}</p>
                    )}
                    {(c.sla_resposta_horas != null || c.sla_resolucao_horas != null) && (
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {c.sla_resposta_horas != null && (
                          <span>SLA resposta: <strong className="text-foreground">{c.sla_resposta_horas}h</strong></span>
                        )}
                        {c.sla_resolucao_horas != null && (
                          <span>SLA resolução: <strong className="text-foreground">{c.sla_resolucao_horas}h</strong></span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmarRemover(c)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar categoria" : "Nova categoria"}
            </DialogTitle>
            <DialogDescription>
              Categorias aparecem como opções ao criar ou editar um chamado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-nome">Nome *</Label>
              <Input
                id="cat-nome"
                maxLength={60}
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Financeiro"
              />
              {erros.nome && <p className="text-xs text-destructive">{erros.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Descrição</Label>
              <Textarea
                id="cat-desc"
                maxLength={300}
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
              {erros.descricao && (
                <p className="text-xs text-destructive">{erros.descricao}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-cor">Cor</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cat-cor"
                  type="color"
                  className="h-10 w-16 cursor-pointer p-1"
                  value={form.cor}
                  onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                />
                <Input
                  maxLength={7}
                  value={form.cor}
                  onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                  className="font-mono"
                />
              </div>
              {erros.cor && <p className="text-xs text-destructive">{erros.cor}</p>}
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                SLA (horas)
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Usado para sugerir o prazo automaticamente ao abrir um chamado nesta categoria.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-sla-resp">Resposta</Label>
                  <Input
                    id="cat-sla-resp"
                    type="number"
                    min={0}
                    placeholder="Ex.: 4"
                    value={form.sla_resposta_horas}
                    onChange={(e) => setForm((f) => ({ ...f, sla_resposta_horas: e.target.value }))}
                  />
                  {erros.sla_resposta_horas && (
                    <p className="text-xs text-destructive">{erros.sla_resposta_horas}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-sla-res">Resolução</Label>
                  <Input
                    id="cat-sla-res"
                    type="number"
                    min={0}
                    placeholder="Ex.: 24"
                    value={form.sla_resolucao_horas}
                    onChange={(e) => setForm((f) => ({ ...f, sla_resolucao_horas: e.target.value }))}
                  />
                  {erros.sla_resolucao_horas && (
                    <p className="text-xs text-destructive">{erros.sla_resolucao_horas}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={salvar.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmarRemover}
        onOpenChange={(o) => !o && setConfirmarRemover(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Os chamados marcados com <strong>{confirmarRemover?.nome}</strong> manterão
              o texto da categoria, mas ela não estará mais disponível para seleção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmarRemover && remover.mutate(confirmarRemover.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
