import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useUsuarioAtualId } from "@/auth/atual";
import { prefetchChamadosQuadro } from "@/hooks/useChamados";
import { prefetchFunisKanban } from "@/hooks/useFunisKanban";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/w/$slug/chamados")({
  component: LayoutChamados,
  head: () => ({ meta: [{ title: "Chamados | Nutricar" }] }),
});

function LayoutChamados() {
  const { workspaceAtual } = useWorkspaceStore();
  const usuarioId = useUsuarioAtualId();
  const queryClient = useQueryClient();
  const caminho = useRouterState({ select: (s) => s.location.pathname });

  const prefetchQuadro = useCallback(() => {
    if (!workspaceAtual?.id || !usuarioId) return;
    void prefetchChamadosQuadro(queryClient, workspaceAtual.id);
    void prefetchFunisKanban(queryClient, workspaceAtual.id, usuarioId);
  }, [queryClient, workspaceAtual?.id, usuarioId]);

  if (!workspaceAtual) return null;

  const base = `/w/${workspaceAtual.slug}/chamados`;
  const abas = [
    { rotulo: "Lista", href: base, ativoQuando: caminho === base || caminho === `${base}/` },
    {
      rotulo: "Quadro",
      href: `${base}/quadro`,
      ativoQuando: caminho.startsWith(`${base}/quadro`),
      prefetch: true,
    },
  ];

  // Esconder abas ao criar / detalhar
  const mostrarAbas =
    !caminho.includes(`${base}/novo`) &&
    !/\/chamados\/\d+/.test(caminho);

  const ehQuadro = caminho.startsWith(`${base}/quadro`);

  return (
    <div
      className={cn(
        "w-full px-3 py-6 sm:px-4 md:px-5 lg:px-6",
        ehQuadro ? "max-w-none" : "mx-auto max-w-[min(100%,1920px)]",
      )}
    >
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Chamados</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie chamados e tarefas da empresa.
          </p>
        </div>
        {mostrarAbas && (
          <nav className="flex gap-1 rounded-lg bg-muted p-1">
            {abas.map((a) => (
              <Link
                key={a.href}
                to={a.href}
                onMouseEnter={a.prefetch ? prefetchQuadro : undefined}
                onFocus={a.prefetch ? prefetchQuadro : undefined}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  a.ativoQuando
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <Outlet />
    </div>
  );
}
