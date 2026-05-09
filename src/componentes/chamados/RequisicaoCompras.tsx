import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, ShoppingCart, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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

interface Props {
  chamadoId: string;
}

interface ItemReq {
  id: string;
  ordem: number;
  quantidade: number;
  unidade: string | null;
  descricao: string;
  referencia: string | null;
  data_necessidade: string | null;
  prioridade: PrioridadeChamado;
}

const corPrioridade: Record<PrioridadeChamado, string> = {
  Baixa: "bg-muted text-muted-foreground",
  Media: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  Alta: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  Urgente: "bg-red-500/15 text-red-700 dark:text-red-300",
};

function ehLink(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

export function RequisicaoCompras({ chamadoId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["requisicao-itens", chamadoId],
    queryFn: async (): Promise<ItemReq[]> => {
      const { data, error } = await supabase
        .from("chamado_requisicao_itens")
        .select(
          "id, ordem, quantidade, unidade, descricao, referencia, data_necessidade, prioridade",
        )
        .eq("chamado_id", chamadoId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemReq[];
    },
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

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Requisição de Compras</h2>
          <Badge variant="secondary">{itens.length} {itens.length === 1 ? "item" : "itens"}</Badge>
        </div>
      </header>

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item informado.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24 text-right">Qtd</TableHead>
                <TableHead className="w-20">Unid.</TableHead>
                <TableHead>Referência / Marca / Link</TableHead>
                <TableHead className="w-32">Necessidade</TableHead>
                <TableHead className="w-28">Prioridade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((it, i) => (
                <TableRow key={it.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{it.descricao}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(it.quantidade).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{it.unidade || "—"}</TableCell>
                  <TableCell className="max-w-xs">
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
                    <Badge className={corPrioridade[it.prioridade]} variant="secondary">
                      {rotuloPrioridade[it.prioridade]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
