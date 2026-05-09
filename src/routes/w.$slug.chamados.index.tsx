import { createFileRoute } from "@tanstack/react-router";
import { ListaChamados } from "@/paginas/chamados/ListaChamados";

export const Route = createFileRoute("/w/$slug/chamados/")({
  component: ListaChamados,
});
