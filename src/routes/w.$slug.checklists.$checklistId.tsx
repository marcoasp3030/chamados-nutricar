import { createFileRoute } from "@tanstack/react-router";
import { DetalheChecklist } from "@/paginas/checklists/DetalheChecklist";

export const Route = createFileRoute("/w/$slug/checklists/$checklistId")({
  component: function PaginaDetalheChecklist() {
    const { checklistId } = Route.useParams();
    return <DetalheChecklist checklistId={checklistId} />;
  },
});
