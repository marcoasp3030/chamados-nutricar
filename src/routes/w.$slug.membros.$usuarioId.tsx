import { createFileRoute } from "@tanstack/react-router";
import { PerfilMembro } from "@/paginas/membros/PerfilMembro";

export const Route = createFileRoute("/w/$slug/membros/$usuarioId")({
  component: function PaginaPerfilMembro() {
    const { usuarioId } = Route.useParams();
    return <PerfilMembro usuarioId={usuarioId} />;
  },
  head: () => ({ meta: [{ title: "Perfil do membro | Nutricar" }] }),
});
