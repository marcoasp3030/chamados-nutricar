import logo from "@/assets/nutricar-logo.png";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { MenuNavegacao } from "./MenuNavegacao";

export function BarraLateral() {
  const { workspaceAtual } = useWorkspaceStore();

  if (!workspaceAtual) return null;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <img src={logo} alt="Nutricar" className="h-8 w-auto" />
      </div>

      <MenuNavegacao />

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        <span
          className="mr-2 inline-block h-2 w-2 rounded-full"
          style={{ background: workspaceAtual.cor_primaria }}
        />
        {workspaceAtual.plano}
      </div>
    </aside>
  );
}
