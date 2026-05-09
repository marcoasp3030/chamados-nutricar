import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ItemRequisicao {
  quantidade: number;
  unidade: string;
  descricao: string;
  referencia: string;
  data_necessidade: string | null;
}

export function itemRequisicaoVazio(): ItemRequisicao {
  return {
    quantidade: 1,
    unidade: "un",
    descricao: "",
    referencia: "",
    data_necessidade: null,
  };
}

interface Props {
  itens: ItemRequisicao[];
  aoMudar: (itens: ItemRequisicao[]) => void;
  desabilitado?: boolean;
}

export function ItensRequisicao({ itens, aoMudar, desabilitado }: Props) {
  function atualizar<K extends keyof ItemRequisicao>(
    indice: number,
    chave: K,
    valor: ItemRequisicao[K],
  ) {
    aoMudar(itens.map((it, i) => (i === indice ? { ...it, [chave]: valor } : it)));
  }

  function adicionar() {
    aoMudar([...itens, itemRequisicaoVazio()]);
  }

  function remover(indice: number) {
    aoMudar(itens.filter((_, i) => i !== indice));
  }

  return (
    <div className="space-y-3">
      {itens.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Nenhum item adicionado. Clique em "Adicionar item" para começar.
        </p>
      )}

      {itens.map((item, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Item {i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remover(i)}
              disabled={desabilitado}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade *</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={item.quantidade}
                onChange={(e) =>
                  atualizar(i, "quantidade", Number(e.target.value) || 0)
                }
                disabled={desabilitado}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unidade</Label>
              <Input
                placeholder="un, cx, kg..."
                value={item.unidade}
                onChange={(e) => atualizar(i, "unidade", e.target.value)}
                disabled={desabilitado}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-4">
              <Label className="text-xs">Descrição *</Label>
              <Input
                required
                placeholder="O que precisa ser comprado"
                value={item.descricao}
                onChange={(e) => atualizar(i, "descricao", e.target.value)}
                disabled={desabilitado}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-4">
              <Label className="text-xs">Referência / Marca / Link</Label>
              <Input
                placeholder="Ex.: Marca XYZ ou https://..."
                value={item.referencia}
                onChange={(e) => atualizar(i, "referencia", e.target.value)}
                disabled={desabilitado}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Data de necessidade</Label>
              <Input
                type="date"
                value={item.data_necessidade ?? ""}
                onChange={(e) =>
                  atualizar(i, "data_necessidade", e.target.value || null)
                }
                disabled={desabilitado}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={adicionar}
        disabled={desabilitado}
      >
        <Plus className="h-4 w-4" />
        Adicionar item
      </Button>
    </div>
  );
}
