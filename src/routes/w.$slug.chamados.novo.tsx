import { createFileRoute } from "@tanstack/react-router";
import { NovoChamado } from "@/paginas/chamados/NovoChamado";

export const Route = createFileRoute("/w/$slug/chamados/novo")({
  component: () => <NovoChamado />,
  head: () => ({ meta: [{ title: "Novo chamado | Nutricar" }] }),
});
