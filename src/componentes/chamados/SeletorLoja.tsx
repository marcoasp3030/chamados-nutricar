import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useLojasVMPay } from "@/hooks/useLojasVMPay";

interface Props {
  workspaceId: string;
  valor: string | null;
  aoMudar: (valor: string | null) => void;
}

export function SeletorLoja({ workspaceId, valor, aoMudar }: Props) {
  const [aberto, setAberto] = useState(false);
  const { data: lojas, isLoading, error, refetch, isFetching } = useLojasVMPay(workspaceId);

  const ordenadas = useMemo(
    () => [...(lojas ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [lojas],
  );

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {valor || "Selecionar loja"}
            </span>
          </span>
          {valor ? (
            <X
              className="h-4 w-4 shrink-0 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                aoMudar(null);
              }}
            />
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Digite para filtrar..." />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando lojas...
              </div>
            )}
            {error && (
              <div className="space-y-2 px-3 py-4 text-sm">
                <p className="text-destructive">{(error as Error).message}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="w-full"
                >
                  {isFetching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Tentar novamente
                </Button>
              </div>
            )}
            {!isLoading && !error && (
              <>
                <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                <CommandGroup>
                  {ordenadas.map((loja) => (
                    <CommandItem
                      key={loja.id}
                      value={loja.name}
                      onSelect={(v) => {
                        aoMudar(v);
                        setAberto(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          valor === loja.name ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {loja.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
