import { createFileRoute } from "@tanstack/react-router";
import { PaginaLojas } from "@/paginas/lojas/PaginaLojas";

export const Route = createFileRoute("/w/$slug/lojas")({
  component: PaginaLojas,
});
