import { createFileRoute } from "@tanstack/react-router";
import { ListaProjetos } from "@/paginas/projetos/ListaProjetos";

export const Route = createFileRoute("/w/$slug/projetos/")({
  component: ListaProjetos,
});
