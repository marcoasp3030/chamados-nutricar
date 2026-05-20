import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/dados/atual";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { STATUS_CHAMADO, PRIORIDADES_CHAMADO, type StatusChamado } from "@/tipos/chamado";
import { rotuloStatusChamado, rotuloPrioridade } from "@/utilitarios/traducoes";
import {
  useFunisKanban,
  type FunilKanban,
  type FiltrosFunil,
} from "@/hooks/useFunisKanban";

interface Props {
  workspaceId: string;
  usuarioId: string;
  children?: React.ReactNode;
}

export function GerenciadorFunis({ workspaceId, usuarioId, children }: Props) {
  const [open, setOpen] = useState(false);
  const { data: funis = [], salvar, excluir, reordenar } = useFunisKanban(workspaceId, usuarioId);
  const [editando, setEditando] = useState<Partial<FunilKanban> | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);

  function novo() {
    setEditando({
      nome: "",
      cor: "#64748b",
      tipo: "status",
      status_origem: "Aberto",
      filtros: {},
      ordem: funis.length,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar funis do quadro</DialogTitle>
        </DialogHeader>

        {editando ? (
          <FormularioFunil
            valor={editando}
            funisExistentes={funis}
            workspaceId={workspaceId}
            onCancelar={() => setEditando(null)}
            onSalvar={async (v) => {
              try {
                await salvar.mutateAsync({
                  ...v,
                  workspace_id: workspaceId,
                  usuario_id: usuarioId,
                } as any);
                toast.success(v.id ? "Funil atualizado." : "Funil criado.");
                setEditando(null);
              } catch (e: any) {
                toast.error("Erro ao salvar.", { description: e.message });
              }
            }}
          />
        ) : (
          <>
            <div className="space-y-2">
              {funis.map((f) => (
                <div
                  key={f.id}
                  draggable
                  onDragStart={() => setArrastando(f.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!arrastando || arrastando === f.id) return;
                    const ids = funis.map((x) => x.id);
                    const from = ids.indexOf(arrastando);
                    const to = ids.indexOf(f.id);
                    ids.splice(to, 0, ids.splice(from, 1)[0]);
                    reordenar.mutate(ids);
                    setArrastando(null);
                  }}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                  <span
                    className="h-4 w-4 shrink-0 rounded"
                    style={{ background: f.cor }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{f.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.tipo === "status"
                        ? `Status: ${rotuloStatusChamado[f.status_origem as StatusChamado] ?? "—"}`
                        : "Filtro personalizado"}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditando(f)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Excluir o funil "${f.nome}"?`)) excluir.mutate(f.id);
                    }}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={novo} className="gap-2">
                <Plus className="h-4 w-4" /> Novo funil
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormularioFunil({
  valor,
  funisExistentes,
  workspaceId,
  onCancelar,
  onSalvar,
}: {
  valor: Partial<FunilKanban>;
  funisExistentes: FunilKanban[];
  workspaceId: string;
  onCancelar: () => void;
  onSalvar: (v: Partial<FunilKanban>) => Promise<void> | void;
}) {
  const [v, setV] = useState<Partial<FunilKanban>>(valor);
  const [salvando, setSalvando] = useState(false);
  const filtros: FiltrosFunil = v.filtros ?? {};

  const { data: depts = [] } = useQuery({
    queryKey: ["dept-list", workspaceId],
    queryFn: async () => {
      const { data } = await db
        .from("departamentos")
        .select("id, nome")
        .eq("workspace_id", workspaceId)
        .order("nome");
      return data ?? [];
    },
  });

  function updateFiltros(p: Partial<FiltrosFunil>) {
    setV({ ...v, filtros: { ...filtros, ...p } });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nome</Label>
          <Input
            value={v.nome ?? ""}
            onChange={(e) => setV({ ...v, nome: e.target.value })}
            placeholder="Ex: Novos, Lojas, Urgências"
          />
        </div>
        <div>
          <Label>Cor</Label>
          <Input
            type="color"
            value={v.cor ?? "#64748b"}
            onChange={(e) => setV({ ...v, cor: e.target.value })}
            className="h-9 p-1"
          />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select
            value={v.tipo ?? "status"}
            onValueChange={(t) => setV({ ...v, tipo: t as "status" | "filtro" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Por status (arrastar muda status)</SelectItem>
              <SelectItem value="filtro">Por filtro personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {v.tipo === "status" ? (
        <div>
          <Label>Status do chamado</Label>
          <Select
            value={v.status_origem ?? "Aberto"}
            onValueChange={(s) => setV({ ...v, status_origem: s as StatusChamado })}
          >
            <SelectTrigger>
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
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            O funil mostra apenas chamados que atendem a TODOS os filtros marcados.
          </p>

          <div>
            <Label className="text-xs">Prioridades</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {PRIORIDADES_CHAMADO.map((p) => {
                const ativo = filtros.prioridades?.includes(p) ?? false;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => {
                      const set = new Set(filtros.prioridades ?? []);
                      ativo ? set.delete(p) : set.add(p);
                      updateFiltros({ prioridades: [...set] });
                    }}
                  >
                    <Badge variant={ativo ? "default" : "outline"}>
                      {rotuloPrioridade[p]}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs">Departamentos</Label>
            <div className="mt-1 grid max-h-32 grid-cols-2 gap-1 overflow-y-auto">
              {depts.map((d: any) => {
                const ativo = filtros.departamento_ids?.includes(d.id) ?? false;
                return (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={ativo}
                      onCheckedChange={() => {
                        const set = new Set(filtros.departamento_ids ?? []);
                        ativo ? set.delete(d.id) : set.add(d.id);
                        updateFiltros({ departamento_ids: [...set] });
                      }}
                    />
                    {d.nome}
                  </label>
                );
              })}
            </div>
          </div>

          <ListaTexto
            label="Lojas (separe por vírgula)"
            valor={filtros.lojas ?? []}
            onChange={(v) => updateFiltros({ lojas: v })}
          />
          <ListaTexto
            label="Tags (separe por vírgula)"
            valor={filtros.tags ?? []}
            onChange={(v) => updateFiltros({ tags: v })}
          />
        </div>
      )}

      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          disabled={!v.nome?.trim() || salvando}
          onClick={async () => {
            setSalvando(true);
            await onSalvar(v);
            setSalvando(false);
          }}
        >
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </div>
  );
}

function ListaTexto({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: string[];
  onChange: (v: string[]) => void;
}) {
  const [texto, setTexto] = useState(valor.join(", "));
  useEffect(() => {
    setTexto(valor.join(", "));
  }, [valor]);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          const arr = texto
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          onChange(arr);
        }}
      />
    </div>
  );
}
