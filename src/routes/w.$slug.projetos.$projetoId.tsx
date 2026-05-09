import { createFileRoute } from "@tanstack/react-router";
import { DetalheProjeto } from "@/paginas/projetos/DetalheProjeto";

export const Route = createFileRoute("/w/$slug/projetos/$projetoId")({
  component: ComponenteDetalhe,
  head: () => ({ meta: [{ title: "Projeto | Nutricar" }] }),
});

function ComponenteDetalhe() {
  const { projetoId } = Route.useParams();
  return <DetalheProjeto projetoId={projetoId} />;
}
