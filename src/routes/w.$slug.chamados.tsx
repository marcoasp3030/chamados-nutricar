import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/w/$slug/chamados")({
  component: LayoutChamados,
  head: () => ({ meta: [{ title: "Chamados | Nutricar" }] }),
});

function LayoutChamados() {
  const { workspaceAtual } = useWorkspaceStore();
  const caminho = useRouterState({ select: (s) => s.location.pathname });

  if (!workspaceAtual) return null;

  const base = `/w/${workspaceAtual.slug}/chamados`;
  const abas = [
    { rotulo: "Lista", href: base, ativoQuando: caminho === base || caminho === `${base}/` },
    {
      rotulo: "Quadro",
      href: `${base}/quadro`,
      ativoQuando: caminho.startsWith(`${base}/quadro`),
    },
  ];

  // Esconder abas ao criar / detalhar
  const mostrarAbas =
    !caminho.includes(`${base}/novo`) &&
    !/\/chamados\/\d+/.test(caminho);

  const ehQuadro = caminho.startsWith(`${base}/quadro`);

  return (
    <div className={cn("px-6 py-8", ehQuadro ? "mx-auto max-w-[1800px]" : "mx-auto max-w-7xl")}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
