import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Ticket,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/estado/workspaceStore";

const itens = [
  { rotulo: "Painel", para: "/w/$slug/painel" as const, icone: LayoutDashboard },
  { rotulo: "Chamados", para: "/w/$slug/chamados" as const, icone: Ticket },
  { rotulo: "Projetos", para: "/w/$slug/projetos" as const, icone: FolderKanban },
  { rotulo: "Clientes", para: "/w/$slug/clientes" as const, icone: Users },
  { rotulo: "Relatórios", para: "/w/$slug/relatorios" as const, icone: BarChart3 },
  { rotulo: "Configurações", para: "/w/$slug/configuracoes" as const, icone: Settings },
];

interface Props {
  aoNavegar?: () => void;
}

export function MenuNavegacao({ aoNavegar }: Props) {
  const { workspaceAtual } = useWorkspaceStore();
  const caminho = useRouterState({ select: (s) => s.location.pathname });

  if (!workspaceAtual) return null;

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {itens.map((item) => {
        const href = item.para.replace("$slug", workspaceAtual.slug);
        const ativo = caminho.startsWith(href);
        const Icone = item.icone;
        return (
          <Link
            key={item.para}
            to={item.para}
            params={{ slug: workspaceAtual.slug }}
            onClick={aoNavegar}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icone className="h-4 w-4" />
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
