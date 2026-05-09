import { useNavigate } from "@tanstack/react-router";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMeusWorkspaces } from "@/hooks/useMeusWorkspaces";
import { useWorkspaceStore } from "@/estado/workspaceStore";

export function TrocadorWorkspace() {
  const navigate = useNavigate();
  const { workspaceAtual } = useWorkspaceStore();
  const { data: workspaces = [], isLoading } = useMeusWorkspaces();

  if (!workspaceAtual) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 justify-between gap-3 px-3 text-left font-medium"
        >
          <span className="flex items-center gap-2 truncate">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-primary-foreground"
              style={{ background: workspaceAtual.cor_primaria }}
            >
              {workspaceAtual.nome.charAt(0).toUpperCase()}
            </span>
            <span className="truncate text-sm">{workspaceAtual.nome}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          Suas empresas
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading && (
          <div className="px-2 py-3 text-sm text-muted-foreground">Carregando...</div>
        )}
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => navigate({ to: "/w/$slug/painel", params: { slug: ws.slug } })}
            className="cursor-pointer gap-2"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold text-primary-foreground"
              style={{ background: ws.cor_primaria }}
            >
              {ws.nome.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 truncate">{ws.nome}</span>
            {ws.id === workspaceAtual.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate({ to: "/selecionar-empresa" })}
          className="cursor-pointer gap-2 text-muted-foreground"
        >
          <Building2 className="h-4 w-4" />
          Ver todas as empresas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
