import { createFileRoute } from "@tanstack/react-router";
import { AceitarConvite } from "@/paginas/workspace/AceitarConvite";

export const Route = createFileRoute("/convite/$token")({
  component: PaginaConvite,
  head: () => ({
    meta: [{ title: "Aceitar convite | Nutricar" }],
  }),
});

function PaginaConvite() {
  const { token } = Route.useParams();
  return <AceitarConvite token={token} />;
}
