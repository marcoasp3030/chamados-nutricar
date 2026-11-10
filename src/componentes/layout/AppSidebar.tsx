import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Ticket,
  FolderKanban,
  CheckSquare,
  PartyPopper,
  Boxes,
  Settings,
  HandMetal,
  CheckCircle2,
  Users,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { ehPapelSuporte } from "@/lib/papel-acesso";
import logo from "@/assets/nutricar-logo.png";
import { cn } from "@/lib/utils";

const itensPrincipais = [
  { rotulo: "Painel", para: "/w/$slug/painel" as const, icone: LayoutDashboard },
  { rotulo: "Chamados", para: "/w/$slug/chamados" as const, icone: Ticket },
  { rotulo: "Relatórios", para: "/w/$slug/relatorios" as const, icone: BarChart3 },
  { rotulo: "Projetos", para: "/w/$slug/projetos" as const, icone: FolderKanban },
  { rotulo: "Checklists", para: "/w/$slug/checklists" as const, icone: CheckSquare },
  { rotulo: "Inventário", para: "/w/$slug/inventario" as const, icone: Boxes },
  { rotulo: "Inaugurações", para: "/w/$slug/inauguracoes" as const, icone: PartyPopper },
];

const itensGestao = [
  { rotulo: "Configurações", para: "/w/$slug/configuracoes" as const, icone: Settings },
];

const itensSuporte = [
  { rotulo: "Minha área", para: "/w/$slug/suporte" as const, icone: HandMetal },
  { rotulo: "Equipe", para: "/w/$slug/suporte/equipe" as const, icone: Users },
  { rotulo: "Resolvidos", para: "/w/$slug/suporte/resolvidos" as const, icone: CheckCircle2 },
];

export function AppSidebar() {
  const { workspaceAtual } = useWorkspaceStore();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const caminho = useRouterState({ select: (s) => s.location.pathname });

  if (!workspaceAtual) return null;

  const modoSuporte = ehPapelSuporte(workspaceAtual.papel);
  const menuItens = modoSuporte ? itensSuporte : itensPrincipais;
  const rotuloGrupo = modoSuporte ? "Suporte" : "Operação";

  const renderItem = (item: { rotulo: string; para: string; icone: typeof Ticket }) => {
    const href = item.para.replace("$slug", workspaceAtual.slug);
    const ehMinhaArea = item.para === "/w/$slug/suporte";
    const ehEquipe = item.para === "/w/$slug/suporte/equipe";
    const ehResolvidos = item.para === "/w/$slug/suporte/resolvidos";
    const ativo = modoSuporte
      ? ehResolvidos
        ? caminho.startsWith(href)
        : ehEquipe
          ? caminho.startsWith(href)
          : ehMinhaArea &&
            (caminho === href ||
              caminho === `${href}/` ||
              (/^\/w\/[^/]+\/chamados\/\d+/.test(caminho) && !caminho.includes("/suporte/equipe")))
      : caminho === href || caminho.startsWith(href + "/");
    const Icone = item.icone;
    return (
      <SidebarMenuItem key={item.para}>
        <SidebarMenuButton
          asChild
          isActive={ativo}
          tooltip={item.rotulo}
          className={cn(
            "h-10",
            ativo && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
          )}
        >
          <Link
            to={item.para as "/w/$slug/painel"}
            params={{ slug: workspaceAtual.slug }}
            onClick={() => isMobile && setOpenMobile(false)}
          >
            <Icone className="h-4 w-4" />
            <span>{item.rotulo}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div
          className={cn(
            "flex h-12 items-center gap-2 px-2",
            collapsed && "justify-center px-0",
          )}
        >
          <img src={logo} alt="Nutricar" className={cn("h-7 w-auto", collapsed && "h-6")} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{rotuloGrupo}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{menuItens.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!modoSuporte && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestão</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{itensGestao.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: workspaceAtual.cor_primaria }}
            />
            <span className="truncate">
              {workspaceAtual.nome} · {modoSuporte ? "Suporte" : workspaceAtual.plano}
            </span>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
