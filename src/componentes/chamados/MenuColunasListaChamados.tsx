import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  COLUNAS_OPCIONAIS_LISTA_CHAMADOS,
  type VisibilidadeColunasListaChamados,
} from "@/utilitarios/colunas-lista-chamados";

interface Props {
  colunas: VisibilidadeColunasListaChamados;
  podeSelecionarEmMassa?: boolean;
  onAlternar: (id: (typeof COLUNAS_OPCIONAIS_LISTA_CHAMADOS)[number]["id"], visivel: boolean) => void;
  onRestaurarPadrao: () => void;
}

export function MenuColunasListaChamados({
  colunas,
  podeSelecionarEmMassa = false,
  onAlternar,
  onRestaurarPadrao,
}: Props) {
  const opcoes = COLUNAS_OPCIONAIS_LISTA_CHAMADOS.filter(
    (c) => c.id !== "selecao" || podeSelecionarEmMassa,
  );

  const ocultas = opcoes.filter((c) => !colunas[c.id]).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Colunas
          {ocultas > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {ocultas} oculta{ocultas === 1 ? "" : "s"}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Exibir colunas</DropdownMenuLabel>
        <p className="px-2 pb-1 text-[11px] leading-snug text-muted-foreground">
          Arraste a borda do cabeçalho para ajustar a largura. Duplo clique restaura a coluna.
        </p>
        <DropdownMenuSeparator />
        {opcoes.map((coluna) => (
          <DropdownMenuCheckboxItem
            key={coluna.id}
            checked={colunas[coluna.id]}
            onCheckedChange={(v) => onAlternar(coluna.id, !!v)}
            onSelect={(e) => e.preventDefault()}
          >
            {coluna.rotulo}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRestaurarPadrao} className="text-muted-foreground">
          Restaurar padrão
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
