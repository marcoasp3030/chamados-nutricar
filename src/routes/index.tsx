import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { obterSessao } from "@/auth/atual";
import { listarMinhasWorkspacesApi } from "@/hooks/useMeusWorkspaces";
import { rotaInicialPorPapel } from "@/lib/papel-acesso";

export const Route = createFileRoute("/")({
  component: PaginaInicial,
});

function PaginaInicial() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const sessao = await obterSessao();
        if (!sessao.usuario) {
          navigate({ to: "/login", replace: true });
          return;
        }

        const workspaces = await listarMinhasWorkspacesApi();

        if (workspaces.length === 0) {
          navigate({ to: "/selecionar-empresa", replace: true });
          return;
        }

        if (workspaces.length === 1) {
          const destino = rotaInicialPorPapel(workspaces[0].papel);
          navigate({
            to: destino,
            params: { slug: workspaces[0].slug },
            replace: true,
          });
          return;
        }

        navigate({ to: "/selecionar-empresa", replace: true });
      } catch (e) {
        console.error("[pagina-inicial]", e);
        navigate({ to: "/selecionar-empresa", replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
