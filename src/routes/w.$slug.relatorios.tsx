import { createFileRoute } from "@tanstack/react-router";
import { PaginaRelatorios } from "@/paginas/relatorios/PaginaRelatorios";

export const Route = createFileRoute("/w/$slug/relatorios")({
  component: PaginaRelatorios,
  head: () => ({ meta: [{ title: "Relatórios | Nutricar" }] }),
});
