import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { AppSidebar } from "@/componentes/layout/AppSidebar";
import { Cabecalho } from "@/componentes/layout/Cabecalho";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { PapelMembro, WorkspaceComPapel } from "@/tipos/workspace";

export const Route = createFileRoute("/w/$slug")({
  component: LayoutWorkspace,
});

interface LinhaMembro {
  papel: PapelMembro;
  workspace: WorkspaceComPapel | null;
}

function LayoutWorkspace() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { definirWorkspace, workspaceAtual } = useWorkspaceStore();
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setCarregando(true);
      const { data: sessao } = await supabase.auth.getSession();
      if (!sessao.session) {
        navigate({ to: "/login" });
        return;
      }

      const { data, error } = await supabase
        .from("workspace_membros")
        .select("papel, workspace:workspaces!inner(*)")
        .eq("usuario_id", sessao.session.user.id)
        .eq("ativo", true)
        .eq("workspace.slug", slug)
        .maybeSingle();

      if (cancelado) return;

      if (error || !data || !data.workspace) {
        navigate({ to: "/selecionar-empresa" });
        return;
      }

      const linha = data as unknown as LinhaMembro;
      if (!linha.workspace) {
        navigate({ to: "/selecionar-empresa" });
        return;
      }

      definirWorkspace({ ...linha.workspace, papel: linha.papel });
      setCarregando(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [slug, navigate, definirWorkspace]);

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
