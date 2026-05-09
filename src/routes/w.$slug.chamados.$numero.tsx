import { createFileRoute } from "@tanstack/react-router";
import { DetalheChamado } from "@/paginas/chamados/DetalheChamado";

export const Route = createFileRoute("/w/$slug/chamados/$numero")({
  component: ComponenteDetalhe,
  head: () => ({ meta: [{ title: "Chamado | Nutricar" }] }),
});

function ComponenteDetalhe() {
  const { numero } = Route.useParams();
  const n = parseInt(numero, 10);
  return <DetalheChamado numero={n} />;
}
