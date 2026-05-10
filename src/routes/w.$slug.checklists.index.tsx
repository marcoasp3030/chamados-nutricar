import { createFileRoute } from "@tanstack/react-router";
import { ListaChecklists } from "@/paginas/checklists/ListaChecklists";

export const Route = createFileRoute("/w/$slug/checklists/")({
  component: function PaginaListaChecklists() {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Checklists</h1>
          <p className="text-sm text-muted-foreground">
            Modelos de implantação preenchidos por condomínio.
          </p>
        </header>
        <ListaChecklists />
      </div>
    );
  },
});
