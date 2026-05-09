import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useWorkspaceStore } from "@/estado/workspaceStore";

export const Route = createFileRoute("/w/$slug/projetos")({
  component: LayoutProjetos,
  head: () => ({ meta: [{ title: "Projetos | Nutricar" }] }),
});

function LayoutProjetos() {
  const { workspaceAtual } = useWorkspaceStore();
  if (!workspaceAtual) return null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <p className="text-sm text-muted-foreground">
          Organize iniciativas e acompanhe tarefas no quadro Kanban.
        </p>
      </header>
      <Outlet />
    </div>
  );
}
