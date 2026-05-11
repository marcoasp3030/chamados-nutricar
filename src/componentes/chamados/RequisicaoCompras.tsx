import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  Loader2,
  ShoppingCart,
  ExternalLink,
  AlertTriangle,
  Flame,
  Pencil,
  Check,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rotuloPrioridade } from "@/utilitarios/traducoes";
import type { PrioridadeChamado } from "@/tipos/chamado";
import { obterUsuarioAtual } from "@/auth/atual";

interface Props {
  chamadoId: string;
  codigoChamado?: string;
  tituloChamado?: string;
}

type StatusCompra =
  | "Pendente"
  | "Cotando"
  | "Aprovado"
  | "Comprado"
  | "Recebido"
  | "Cancelado";

const STATUS_COMPRA: StatusCompra[] = [
  "Pendente",
  "Cotando",
  "Aprovado",
  "Comprado",
  "Recebido",
  "Cancelado",
];

const corStatusCompra: Record<StatusCompra, string> = {
  Pendente: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  Cotando: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Aprovado: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  Comprado: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  Recebido: "bg-green-500/15 text-green-700 dark:text-green-300",
  Cancelado: "bg-red-500/15 text-red-700 dark:text-red-300 line-through",
};

interface ItemReq {
  id: string;
  ordem: number;
  quantidade: number;
  unidade: string | null;
  descricao: string;
  referencia: string | null;
  data_necessidade: string | null;
  prioridade: PrioridadeChamado;
  status_compra: StatusCompra;
  observacao_compra: string | null;
  atualizado_compra_em: string | null;
}

const corPrioridade: Record<PrioridadeChamado, string> = {
  Baixa: "bg-muted text-muted-foreground",
  Media: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  Alta: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/40",
  Urgente: "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/50",
};

const linhaDestaque: Partial<Record<PrioridadeChamado, string>> = {
  Alta: "bg-orange-500/5 hover:bg-orange-500/10 border-l-4 border-l-orange-500",
  Urgente: "bg-red-500/10 hover:bg-red-500/15 border-l-4 border-l-red-500",
};

function ehLink(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

export function RequisicaoCompras({ chamadoId, codigoChamado, tituloChamado }: Props) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<string | null>(null);
  const [obsTemp, setObsTemp] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["requisicao-itens", chamadoId],
    queryFn: async (): Promise<ItemReq[]> => {
      const { data, error } = await supabase
        .from("chamado_requisicao_itens")
        .select(
          "id, ordem, quantidade, unidade, descricao, referencia, data_necessidade, prioridade, status_compra, observacao_compra, atualizado_compra_em",
        )
        .eq("chamado_id", chamadoId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemReq[];
    },
  });

  const atualizar = useMutation({
    mutationFn: async (vars: {
      id: string;
      status_compra?: StatusCompra;
      observacao_compra?: string | null;
    }) => {
      const { id, ...campos } = vars;
      const auth = { user: await obterUsuarioAtual() };
      const { error } = await supabase
        .from("chamado_requisicao_itens")
        .update({
          ...campos,
          atualizado_compra_em: new Date().toISOString(),
          atualizado_compra_por: auth.user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisicao-itens", chamadoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando itens...
      </div>
    );
  }

  const itens = data ?? [];
  const urgentes = itens.filter((i) => i.prioridade === "Urgente").length;
  const altas = itens.filter((i) => i.prioridade === "Alta").length;
  const totalCriticos = urgentes + altas;
  const concluidos = itens.filter(
    (i) => i.status_compra === "Recebido" || i.status_compra === "Cancelado",
  ).length;
  const progresso = itens.length > 0 ? Math.round((concluidos / itens.length) * 100) : 0;

  function exportarExcel() {
    if (itens.length === 0) {
      toast.info("Nenhum item para exportar.");
      return;
    }
    const linhas = itens.map((it, i) => ({
      "#": i + 1,
      Descrição: it.descricao,
      Quantidade: Number(it.quantidade),
      Unidade: it.unidade ?? "",
      "Referência / Marca / Link": it.referencia ?? "",
      "Data de necessidade": it.data_necessidade
        ? format(new Date(it.data_necessidade), "dd/MM/yyyy", { locale: ptBR })
        : "",
      Prioridade: rotuloPrioridade[it.prioridade],
      "Status compra": it.status_compra,
      Observação: it.observacao_compra ?? "",
      "Atualizado em": it.atualizado_compra_em
        ? format(new Date(it.atualizado_compra_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "",
    }));

    const wb = XLSX.utils.book_new();

    // Cabeçalho informativo
    const cabecalho: (string | number)[][] = [
      ["Requisição de Compras"],
      [`Chamado: ${codigoChamado ?? ""}`],
      [`Título: ${tituloChamado ?? ""}`],
      [`Exportado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`],
      [`Total de itens: ${itens.length} | Concluídos: ${concluidos} (${progresso}%)`],
      [],
    ];
    const ws = XLSX.utils.aoa_to_sheet(cabecalho);
    XLSX.utils.sheet_add_json(ws, linhas, { origin: "A7" });

    // Larguras de coluna
    ws["!cols"] = [
      { wch: 5 },
      { wch: 45 },
      { wch: 11 },
      { wch: 10 },
      { wch: 35 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 40 },
      { wch: 18 },
    ];

    // Mesclar título
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

    XLSX.utils.book_append_sheet(wb, ws, "Requisição");

    const nomeArq = `requisicao-${(codigoChamado ?? chamadoId).replace(/[^\w-]/g, "_")}-${format(
      new Date(),
      "yyyyMMdd-HHmm",
    )}.xlsx`;
    XLSX.writeFile(wb, nomeArq);
    toast.success("Planilha exportada");
  }


  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Requisição de Compras</h2>
          <Badge variant="secondary">{itens.length} {itens.length === 1 ? "item" : "itens"}</Badge>
          {itens.length > 0 && (
            <Badge variant="outline" className="font-medium">
              {concluidos}/{itens.length} concluídos · {progresso}%
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalCriticos > 0 && (
            <>
              {urgentes > 0 && (
                <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/50 gap-1" variant="secondary">
                  <Flame className="h-3 w-3" />
                  {urgentes} urgente{urgentes > 1 ? "s" : ""}
                </Badge>
              )}
              {altas > 0 && (
                <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/40 gap-1" variant="secondary">
                  <AlertTriangle className="h-3 w-3" />
                  {altas} alta{altas > 1 ? "s" : ""}
                </Badge>
              )}
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportarExcel}
            disabled={itens.length === 0}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar Excel
          </Button>
        </div>
      </header>

      {itens.length > 0 && (
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progresso}%` }}
          />
        </div>
      )}

      {totalCriticos > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Existem {totalCriticos} {totalCriticos === 1 ? "item" : "itens"} de prioridade elevada que requer{totalCriticos === 1 ? "" : "em"} atenção imediata.
          </span>
        </div>
      )}

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item informado.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-20 text-right">Qtd</TableHead>
                <TableHead className="w-20">Unid.</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead className="w-28">Necessidade</TableHead>
                <TableHead className="w-28">Prioridade</TableHead>
                <TableHead className="w-40">Status compra</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((it, i) => {
                const critico = it.prioridade === "Urgente" || it.prioridade === "Alta";
                const emEdicao = editando === it.id;
                return (
                  <TableRow key={it.id} className={cn(linhaDestaque[it.prioridade])}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {it.prioridade === "Urgente" && (
                          <Flame className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                        )}
                        {it.prioridade === "Alta" && (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                        )}
                        <span className={cn(it.status_compra === "Cancelado" && "line-through text-muted-foreground")}>
                          {it.descricao}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(it.quantidade).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>{it.unidade || "—"}</TableCell>
                    <TableCell className="max-w-[200px]">
                      {it.referencia ? (
                        ehLink(it.referencia) ? (
                          <a
                            href={it.referencia}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="truncate">{it.referencia}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-foreground">{it.referencia}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {it.data_necessidade
                        ? format(new Date(it.data_necessidade), "dd/MM/yyyy", { locale: ptBR })
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(corPrioridade[it.prioridade], "gap-1", critico && "font-semibold")}
                        variant="secondary"
                      >
                        {it.prioridade === "Urgente" && <Flame className="h-3 w-3" />}
                        {it.prioridade === "Alta" && <AlertTriangle className="h-3 w-3" />}
                        {rotuloPrioridade[it.prioridade]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={it.status_compra}
                        onValueChange={(v) =>
                          atualizar.mutate({ id: it.id, status_compra: v as StatusCompra })
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-8 w-full border-0 px-2 text-xs font-medium",
                            corStatusCompra[it.status_compra],
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_COMPRA.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {it.atualizado_compra_em && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {format(new Date(it.atualizado_compra_em), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      {emEdicao ? (
                        <div className="flex items-start gap-1">
                          <Textarea
                            value={obsTemp}
                            onChange={(e) => setObsTemp(e.target.value)}
                            rows={2}
                            className="min-h-[40px] text-xs"
                            placeholder="Fornecedor, valor, prazo..."
                            autoFocus
                          />
                          <div className="flex flex-col gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                atualizar.mutate({
                                  id: it.id,
                                  observacao_compra: obsTemp.trim() || null,
                                });
                                setEditando(null);
                              }}
                            >
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setEditando(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditando(it.id);
                            setObsTemp(it.observacao_compra ?? "");
                          }}
                          className="group flex w-full items-start gap-1 rounded-md p-1 text-left text-xs hover:bg-muted"
                        >
                          <span className={cn("flex-1", !it.observacao_compra && "italic text-muted-foreground")}>
                            {it.observacao_compra || "Adicionar observação..."}
                          </span>
                          <Pencil className="mt-0.5 h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
