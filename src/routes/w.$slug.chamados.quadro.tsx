import { createFileRoute } from "@tanstack/react-router";
import { QuadroChamados } from "@/paginas/chamados/QuadroChamados";

export const Route = createFileRoute("/w/$slug/chamados/quadro")({
  component: QuadroChamados,
  head: () => ({ meta: [{ title: "Quadro de chamados | Nutricar" }] }),
});
