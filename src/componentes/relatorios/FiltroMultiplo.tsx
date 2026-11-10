import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface OpcaoFiltro {
  valor: string;
  rotulo: string;
}

interface Props {
  rotulo: string;
  opcoes: OpcaoFiltro[];
  selecionados: string[];
  onChange: (valores: string[]) => void;
  className?: string;
}

/** Filtro de seleção múltipla com busca, no estilo "chip". */
export function FiltroMultiplo({ rotulo, opcoes, selecionados, onChange, className }: Props) {
  const [aberto, setAberto] = useState(false);
  const ativos = selecionados.length;

  const alternar = (v: string) =>
    onChange(selecionados.includes(v) ? selecionados.filter((x) => x !== v) : [...selecionados, v]);

  const resumo =
    ativos === 0
      ? "Todos"
      : ativos === 1
        ? (opcoes.find((o) => o.valor === selecionados[0])?.rotulo ?? "1 selecionado")
        : `${ativos} selecionados`;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 justify-between gap-2 rounded-lg font-normal",
            ativos > 0 && "border-primary/50 bg-primary/5",
            className,
          )}
        >
          <span className="truncate text-xs">
            <span className="text-muted-foreground">{rotulo}: </span>
            <span className={cn(ativos > 0 && "font-medium text-foreground")}>{resumo}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          {opcoes.length > 6 && <CommandInput placeholder={`Buscar ${rotulo.toLowerCase()}…`} />}
          <CommandList>
            <CommandEmpty>Nenhuma opção.</CommandEmpty>
            <CommandGroup>
              {opcoes.map((o) => {
                const marcado = selecionados.includes(o.valor);
                return (
                  <CommandItem key={o.valor} value={o.rotulo} onSelect={() => alternar(o.valor)}>
                    <span
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded border",
                        marcado
                          ? "border-primary bg-primary text-primary-foreground"
                          : "opacity-60",
                      )}
                    >
                      {marcado && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{o.rotulo}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {ativos > 0 && (
            <div className="border-t p-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={() => onChange([])}
              >
                Limpar seleção
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
