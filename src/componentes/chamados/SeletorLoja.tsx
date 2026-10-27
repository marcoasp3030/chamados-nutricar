import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, MapPin, Store, X } from "lucide-react";
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
import { useLocaisVMPay, type LocalVmpay } from "@/hooks/useLocaisVMPay";

interface Props {
  workspaceId: string;
  valor: string | null;
  aoMudar: (valor: string | null) => void;
}

/** Texto secundário: bairro · cidade/UF · rua */
function resumoEndereco(local: LocalVmpay): string {
  const rua = [local.street, local.number].filter(Boolean).join(", ");
  const cidadeUf = [local.city, local.state].filter(Boolean).join("/");
  return [local.neighborhood, cidadeUf, rua].filter(Boolean).join(" · ");
}

/** Chave de agrupamento: "Curitiba (PR)" ou "Sem cidade" */
function chaveGrupo(local: LocalVmpay): string {
  if (local.city?.trim()) {
    return local.state?.trim()
      ? `${local.city.trim()} (${local.state.trim()})`
      : local.city.trim();
  }
  return "Sem cidade";
}

/** Valor pesquisável no Command (nome + endereço) */
function valorBusca(local: LocalVmpay): string {
  return [
    local.name,
    local.neighborhood,
    local.city,
    local.state,
    local.street,
    local.number,
    local.complement,
    local.zip_code,
  ]
    .filter(Boolean)
    .join(" ");
}

export function SeletorLoja({ workspaceId, valor, aoMudar }: Props) {
  const [aberto, setAberto] = useState(false);
  const {
    data: lojas,
    isLoading: carregandoLojas,
    error: erroLojas,
    refetch: refetchLojas,
    isFetching: buscandoLojas,
  } = useLojasVMPay(workspaceId);
  const {
    data: locais,
    isLoading: carregandoLocais,
    isFetching: buscandoLocais,
  } = useLocaisVMPay(workspaceId);

  const temLocais = (locais?.length ?? 0) > 0;
  const isLoading = carregandoLojas || carregandoLocais;
  const isFetching = buscandoLojas || buscandoLocais;

  /** Locais agrupados por cidade/UF, ordenados */
  const gruposLocais = useMemo(() => {
    if (!temLocais) return [];
    const mapa = new Map<string, LocalVmpay[]>();
    for (const local of locais!) {
      const chave = chaveGrupo(local);
      const lista = mapa.get(chave) ?? [];
      lista.push(local);
      mapa.set(chave, lista);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => {
        if (a === "Sem cidade") return 1;
        if (b === "Sem cidade") return -1;
        return a.localeCompare(b, "pt-BR");
      })
      .map(([grupo, itens]) => ({
        grupo,
        itens: [...itens].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      }));
  }, [locais, temLocais]);

  /** Clientes sem local correspondente (fallback / complemento) */
  const lojasSemLocal = useMemo(() => {
    const nomesLocais = new Set(
      (locais ?? []).map((l) => l.name.trim().toLowerCase()),
    );
    return [...(lojas ?? [])]
      .filter((l) => !nomesLocais.has(l.name.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [lojas, locais]);

  const ordenadasClientes = useMemo(
    () => [...(lojas ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
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
            <span className="truncate">{valor || "Selecionar loja"}</span>
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
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput
            placeholder={
              temLocais
                ? "Buscar por nome, cidade, bairro..."
                : "Digite para filtrar..."
            }
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando lojas...
              </div>
            )}
            {erroLojas && !temLocais && (
              <div className="space-y-2 px-3 py-4 text-sm">
                <p className="text-destructive">{(erroLojas as Error).message}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => refetchLojas()}
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
            {!isLoading && !erroLojas && !temLocais && (
              <>
                <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                <CommandGroup>
                  {ordenadasClientes.map((loja) => (
                    <CommandItem
                      key={loja.id}
                      value={loja.name}
                      onSelect={() => {
                        aoMudar(loja.name);
                        setAberto(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          valor === loja.name ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {loja.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            {!isLoading && temLocais && (
              <>
                <CommandEmpty>Nenhum local encontrado.</CommandEmpty>
                {gruposLocais.map(({ grupo, itens }) => (
                  <CommandGroup key={grupo} heading={grupo}>
                    {itens.map((local) => {
                      const endereco = resumoEndereco(local);
                      return (
                        <CommandItem
                          key={local.id}
                          value={valorBusca(local)}
                          onSelect={() => {
                            aoMudar(local.name);
                            setAberto(false);
                          }}
                          className="items-start py-2"
                        >
                          <Check
                            className={cn(
                              "mt-0.5 mr-2 h-4 w-4 shrink-0",
                              valor === local.name ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium leading-tight">
                              {local.name}
                            </span>
                            {endereco ? (
                              <span className="flex items-start gap-1 text-xs text-muted-foreground">
                                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                                <span className="line-clamp-2">{endereco}</span>
                              </span>
                            ) : null}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
                {lojasSemLocal.length > 0 && (
                  <CommandGroup heading="Outras lojas (sem endereço)">
                    {lojasSemLocal.map((loja) => (
                      <CommandItem
                        key={`cli-${loja.id}`}
                        value={loja.name}
                        onSelect={() => {
                          aoMudar(loja.name);
                          setAberto(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            valor === loja.name ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {loja.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
