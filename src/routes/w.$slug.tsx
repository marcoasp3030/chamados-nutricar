import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { AppSidebar } from "@/componentes/layout/AppSidebar";
import { Cabecalho } from "@/componentes/layout/Cabecalho";
import { SidebarProvider } from "@/components/ui/sidebar";
import { obterSessao } from "@/auth/atual";
import { buscarWorkspacePorSlug } from "@/hooks/useMeusWorkspaces";
import { ehPapelSuporte, rotaPermitidaSuporte } from "@/lib/papel-acesso";

export const Route = createFileRoute("/w/$slug")({
  component: LayoutWorkspace,
});

function LayoutWorkspace() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { definirWorkspace, workspaceAtual } = useWorkspaceStore();
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setCarregando(true);
      try {
        const sessao = await obterSessao();
        if (cancelado) return;

        if (!sessao.usuario) {
          navigate({ to: "/login" });
          return;
        }

        const workspace = await buscarWorkspacePorSlug(slug);
        if (cancelado) return;

        if (!workspace) {
          navigate({ to: "/selecionar-empresa" });
          return;
        }

        definirWorkspace(workspace);
      } catch (e) {
        console.error("[workspace/layout]", e);
        if (!cancelado) navigate({ to: "/selecionar-empresa" });
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!workspaceAtual || workspaceAtual.slug !== slug) return;
    if (!ehPapelSuporte(workspaceAtual.papel)) return;
    if (!rotaPermitidaSuporte(pathname, slug)) {
      navigate({ to: "/w/$slug/suporte", params: { slug }, replace: true });
    }
  }, [workspaceAtual, pathname, slug, navigate]);

  if (carregando || !workspaceAtual || workspaceAtual.slug !== slug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Cabecalho />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
