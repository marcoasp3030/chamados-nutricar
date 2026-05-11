import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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

export interface Departamento {
  id: string;
  nome: string;
  descricao: string | null;
  workspace_id: string;
  criado_em: string;
}

const departamentoSchema = z.object({
  nome: z.string().trim().min(2, "Mínimo de 2 caracteres").max(80, "Máximo de 80 caracteres"),
  descricao: z.string().trim().max(300).optional().or(z.literal("")),
});

export function useDepartamentos(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["departamentos", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Departamento[]> => {
      const { data, error } = await db
        .from("departamentos")
        .select("id, nome, descricao, workspace_id, criado_em")
        .eq("workspace_id", workspaceId!)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function AbaDepartamentos() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useDepartamentos(workspaceAtual?.id);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Departamento | null>(null);
  const [confirmarRemover, setConfirmarRemover] = useState<Departamento | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "" });
  const [erros, setErros] = useState<{ nome?: string; descricao?: string }>({});

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", descricao: "" });
    setErros({});
    setAberto(true);
  }

  function abrirEdicao(d: Departamento) {
    setEditando(d);
    setForm({ nome: d.nome, descricao: d.descricao ?? "" });
    setErros({});
    setAberto(true);
  }

  const salvar = useMutation({
    mutationFn: async () => {
      const parse = departamentoSchema.safeParse(form);
      if (!parse.success) {
        const flat = parse.error.flatten().fieldErrors;
        setErros({ nome: flat.nome?.[0], descricao: flat.descricao?.[0] });
        throw new Error("Verifique os campos");
      }
      if (!workspaceAtual) throw new Error("Workspace inválido");
      const u = { user: await obterUsuarioAtual() };
      if (!u.user) throw new Error("Sessão expirada");

      const payload = {
        nome: parse.data.nome,
        descricao: parse.data.descricao || null,
      };

      if (editando) {
        const { error } = await db
          .from("departamentos")
          .update(payload)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("departamentos").insert({
          ...payload,
          workspace_id: workspaceAtual.id,
          criado_por: u.user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departamentos"] });
      toast.success(editando ? "Departamento atualizado." : "Departamento criado.");
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
      const { error } = await db.from("departamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departamentos"] });
      toast.success("Departamento removido.");
      setConfirmarRemover(null);
    },
    onError: (e: Error) =>
      toast.error("Não foi possível remover.", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Departamentos</h2>
          <p className="text-sm text-muted-foreground">
            Organize sua empresa por áreas (ex.: Financeiro, TI, Operações).
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4" /> Novo departamento
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum departamento cadastrado.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.nome}</p>
                  {d.descricao && (
                    <p className="truncate text-xs text-muted-foreground">{d.descricao}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmarRemover(d)}
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
              {editando ? "Editar departamento" : "Novo departamento"}
            </DialogTitle>
            <DialogDescription>
              Departamentos ajudam a categorizar usuários e chamados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dep-nome">Nome *</Label>
              <Input
                id="dep-nome"
                maxLength={80}
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Financeiro"
              />
              {erros.nome && <p className="text-xs text-destructive">{erros.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dep-desc">Descrição</Label>
              <Textarea
                id="dep-desc"
                maxLength={300}
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
              {erros.descricao && (
                <p className="text-xs text-destructive">{erros.descricao}</p>
              )}
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
            <AlertDialogTitle>Remover departamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Os usuários vinculados a <strong>{confirmarRemover?.nome}</strong> ficarão sem
              departamento. Esta ação não pode ser desfeita.
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
