import { useMemo, useState } from "react";
import {
  Boxes,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ArrowDown,
  ArrowUp,
  Settings2,
  Share2,
  AlertTriangle,
  History,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useUsuarioAtualId } from "@/auth/atual";
import { useDepartamentos } from "@/componentes/configuracoes/AbaDepartamentos";
import {
  useDepartamentosDoUsuario,
  useItensInventario,
  useMovimentacoesItem,
  useCompartilhamentos,
  useMutacoesInventario,
  type ItemInventario,
} from "@/hooks/useInventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PaginaInventario() {
  const { workspaceAtual } = useWorkspaceStore();
  const usuarioId = useUsuarioAtualId();
  const wsId = workspaceAtual?.id;
  const papel = workspaceAtual?.papel;
  const ehAdmin = papel === "Proprietario" || papel === "Administrador";

  const { data: todosDepartamentos = [] } = useDepartamentos(wsId);
  const { data: meusDepIds = [] } = useDepartamentosDoUsuario(wsId, usuarioId);
  const { data: todosCompart = [] } = useCompartilhamentos(wsId, undefined);

  // Departamentos visíveis: admin vê todos; demais veem onde são membros + os que compartilharam com eles
  const departamentosVisiveis = useMemo(() => {
    if (ehAdmin) return todosDepartamentos;
    const setVisiveis = new Set<string>(meusDepIds);
    // adiciona departamentos que compartilharam com algum dos meus
    return todosDepartamentos.filter((d) => setVisiveis.has(d.id));
  }, [ehAdmin, todosDepartamentos, meusDepIds, todosCompart]);

  const [depSelecionado, setDepSelecionado] = useState<string | null>(null);
  const depAtual = depSelecionado ?? departamentosVisiveis[0]?.id ?? null;

  if (!wsId) return null;

  return (
    <div className="container mx-auto space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Boxes className="h-6 w-6 text-primary" />
            Inventário
          </h1>
          <p className="text-sm text-muted-foreground">
            Cada departamento gerencia seu próprio inventário. Compartilhe com outros departamentos para
            permitir visualização.
          </p>
        </div>
      </div>

      {departamentosVisiveis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Boxes className="h-10 w-10 opacity-50" />
            <p>Você ainda não tem acesso a nenhum inventário.</p>
            {ehAdmin && <p className="text-sm">Crie departamentos em Configurações para começar.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {departamentosVisiveis.map((d) => {
                const proprio = meusDepIds.includes(d.id) || ehAdmin;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDepSelecionado(d.id)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      depAtual === d.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{d.nome}</span>
                    {!proprio && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        compart.
                      </Badge>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {depAtual && (
            <PainelInventarioDepartamento
              workspaceId={wsId}
              departamentoId={depAtual}
              podeEditar={
                ehAdmin || meusDepIds.includes(depAtual)
              }
              departamentosTodos={todosDepartamentos}
              usuarioId={usuarioId}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface PainelProps {
  workspaceId: string;
  departamentoId: string;
  podeEditar: boolean;
  departamentosTodos: { id: string; nome: string }[];
  usuarioId: string | null;
}

function PainelInventarioDepartamento({
  workspaceId,
  departamentoId,
  podeEditar,
  departamentosTodos,
  usuarioId,
}: PainelProps) {
  const { data: itens = [], isLoading } = useItensInventario(workspaceId, departamentoId);
  const { data: compartilhamentos = [] } = useCompartilhamentos(workspaceId, departamentoId);
  const mut = useMutacoesInventario(workspaceId, usuarioId);

  const [dlgItem, setDlgItem] = useState<Partial<ItemInventario> | null>(null);
  const [excluir, setExcluir] = useState<ItemInventario | null>(null);
  const [movItem, setMovItem] = useState<ItemInventario | null>(null);
  const [histItem, setHistItem] = useState<ItemInventario | null>(null);
  const [dlgCompart, setDlgCompart] = useState(false);

  const nomeDepto = departamentosTodos.find((d) => d.id === departamentoId)?.nome ?? "";

  const baixoEstoque = itens.filter((i) => i.quantidade_minima > 0 && i.quantidade <= i.quantidade_minima);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-base">{nomeDepto}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {itens.length} item(ns){baixoEstoque.length > 0 && ` · ${baixoEstoque.length} abaixo do mínimo`}
          </p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setDlgCompart(true)}>
              <Share2 className="mr-1 h-4 w-4" /> Compartilhar
            </Button>
            <Button size="sm" onClick={() => setDlgItem({ departamento_id: departamentoId })}>
              <Plus className="mr-1 h-4 w-4" /> Novo item
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : itens.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhum item cadastrado{podeEditar ? "." : " neste inventário."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Mín.</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((i) => {
                const baixo = i.quantidade_minima > 0 && i.quantidade <= i.quantidade_minima;
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{i.nome}</div>
                      {i.descricao && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{i.descricao}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.localizacao ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.loja ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <span className={baixo ? "font-semibold text-destructive" : ""}>
                        {Number(i.quantidade)} {i.unidade ?? ""}
                      </span>
                      {baixo && (
                        <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {Number(i.quantidade_minima)}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setHistItem(i)} title="Histórico">
                        <History className="h-4 w-4" />
                      </Button>
                      {podeEditar && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => setMovItem(i)} title="Movimentar">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDlgItem(i)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExcluir(i)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog: criar/editar item */}
      <DialogItem
        item={dlgItem}
        onClose={() => setDlgItem(null)}
        onSalvar={async (dados) => {
          await mut.salvarItem.mutateAsync({ ...dados, departamento_id: departamentoId });
          toast.success(dlgItem?.id ? "Item atualizado" : "Item criado");
          setDlgItem(null);
        }}
      />

      {/* Dialog: movimentar */}
      <DialogMovimentacao
        item={movItem}
        onClose={() => setMovItem(null)}
        onSalvar={async (m) => {
          await mut.registrarMovimentacao.mutateAsync(m);
          toast.success("Movimentação registrada");
          setMovItem(null);
        }}
      />

      {/* Dialog: histórico */}
      <DialogHistorico item={histItem} onClose={() => setHistItem(null)} />

      {/* Dialog: compartilhar */}
      <DialogCompartilhar
        aberto={dlgCompart}
        onClose={() => setDlgCompart(false)}
        departamentoDonoId={departamentoId}
        departamentosTodos={departamentosTodos}
        compartilhamentos={compartilhamentos}
        onAdicionar={async (depId) => {
          await mut.compartilhar.mutateAsync({
            departamento_dono_id: departamentoId,
            departamento_compartilhado_id: depId,
          });
          toast.success("Departamento adicionado");
        }}
        onRemover={async (id) => {
          await mut.removerCompartilhamento.mutateAsync(id);
          toast.success("Compartilhamento removido");
        }}
      />

      {/* Confirmação excluir */}
      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{excluir?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (excluir) {
                  await mut.excluirItem.mutateAsync(excluir.id);
                  toast.success("Item excluído");
                  setExcluir(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function DialogItem({
  item,
  onClose,
  onSalvar,
}: {
  item: Partial<ItemInventario> | null;
  onClose: () => void;
  onSalvar: (dados: {
    id?: string;
    nome: string;
    descricao?: string | null;
    unidade?: string | null;
    quantidade?: number;
    quantidade_minima?: number;
    localizacao?: string | null;
    loja?: string | null;
    departamento_id: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    unidade: "",
    quantidade: 0,
    quantidade_minima: 0,
    localizacao: "",
    loja: "",
  });

  useMemo(() => {
    if (item) {
      setForm({
        nome: item.nome ?? "",
        descricao: item.descricao ?? "",
        unidade: item.unidade ?? "",
        quantidade: Number(item.quantidade ?? 0),
        quantidade_minima: Number(item.quantidade_minima ?? 0),
        localizacao: item.localizacao ?? "",
        loja: item.loja ?? "",
      });
    }
  }, [item]);

  if (!item) return null;
  const editando = !!item.id;

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>
            {editando ? "Atualize as informações do item." : "Cadastre um novo item no inventário."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5">
              <Label>Unidade</Label>
              <Input
                placeholder="un, kg, l..."
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              />
            </div>
            {!editando && (
              <div className="grid gap-1.5">
                <Label>Qtd inicial</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Qtd mínima</Label>
              <Input
                type="number"
                min={0}
                value={form.quantidade_minima}
                onChange={(e) => setForm({ ...form, quantidade_minima: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>Localização</Label>
              <Input
                placeholder="Prateleira A2..."
                value={form.localizacao}
                onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Loja</Label>
              <SeletorLoja
                workspaceId={workspaceAtual!.id}
                valor={form.loja || null}
                aoMudar={(v) => setForm({ ...form, loja: v ?? "" })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!form.nome.trim()) {
                toast.error("Informe o nome");
                return;
              }
              await onSalvar({
                id: item.id,
                departamento_id: item.departamento_id!,
                nome: form.nome.trim(),
                descricao: form.descricao || null,
                unidade: form.unidade || null,
                quantidade: form.quantidade,
                quantidade_minima: form.quantidade_minima,
                localizacao: form.localizacao || null,
                loja: form.loja || null,
              });
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogMovimentacao({
  item,
  onClose,
  onSalvar,
}: {
  item: ItemInventario | null;
  onClose: () => void;
  onSalvar: (m: {
    item_id: string;
    tipo: "entrada" | "saida" | "ajuste";
    quantidade: number;
    motivo?: string;
  }) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("");

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
          <DialogDescription>
            {item.nome} · atual: {Number(item.quantidade)} {item.unidade ?? ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">
                  <ArrowUp className="mr-1 inline h-3.5 w-3.5" /> Entrada
                </SelectItem>
                <SelectItem value="saida">
                  <ArrowDown className="mr-1 inline h-3.5 w-3.5" /> Saída
                </SelectItem>
                <SelectItem value="ajuste">Ajuste (define quantidade)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{tipo === "ajuste" ? "Nova quantidade" : "Quantidade"}</Label>
            <Input
              type="number"
              min={0}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Motivo (opcional)</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (quantidade < 0) {
                toast.error("Quantidade inválida");
                return;
              }
              await onSalvar({
                item_id: item.id,
                tipo,
                quantidade,
                motivo: motivo || undefined,
              });
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogHistorico({ item, onClose }: { item: ItemInventario | null; onClose: () => void }) {
  const { data: movs = [], isLoading } = useMovimentacoesItem(item?.id);
  if (!item) return null;
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico — {item.nome}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : movs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sem movimentações registradas.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movs.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">
                      {new Date(m.criado_em).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.tipo === "entrada"
                            ? "default"
                            : m.tipo === "saida"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {m.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(m.quantidade)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.motivo ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogCompartilhar({
  aberto,
  onClose,
  departamentoDonoId,
  departamentosTodos,
  compartilhamentos,
  onAdicionar,
  onRemover,
}: {
  aberto: boolean;
  onClose: () => void;
  departamentoDonoId: string;
  departamentosTodos: { id: string; nome: string }[];
  compartilhamentos: { id: string; departamento_compartilhado_id: string }[];
  onAdicionar: (depId: string) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
}) {
  const [selecionado, setSelecionado] = useState("");
  const idsCompartilhados = new Set(compartilhamentos.map((c) => c.departamento_compartilhado_id));
  const disponiveis = departamentosTodos.filter(
    (d) => d.id !== departamentoDonoId && !idsCompartilhados.has(d.id),
  );

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Compartilhar inventário
          </DialogTitle>
          <DialogDescription>
            Departamentos selecionados terão acesso somente leitura ao seu inventário.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Select value={selecionado} onValueChange={setSelecionado}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Escolha um departamento" />
              </SelectTrigger>
              <SelectContent>
                {disponiveis.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    Nenhum departamento disponível
                  </div>
                ) : (
                  disponiveis.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              disabled={!selecionado}
              onClick={async () => {
                if (selecionado) {
                  await onAdicionar(selecionado);
                  setSelecionado("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Compartilhado com</Label>
            {compartilhamentos.length === 0 ? (
              <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                Nenhum departamento ainda.
              </div>
            ) : (
              <div className="space-y-1">
                {compartilhamentos.map((c) => {
                  const nome =
                    departamentosTodos.find((d) => d.id === c.departamento_compartilhado_id)?.nome ??
                    "—";
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                    >
                      <span>{nome}</span>
                      <Button variant="ghost" size="icon" onClick={() => onRemover(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
