import { createFileRoute } from "@tanstack/react-router";
import { PaginaConfiguracoes } from "@/paginas/configuracoes/PaginaConfiguracoes";

export const Route = createFileRoute("/w/$slug/configuracoes")({
  component: PaginaConfiguracoes,
});
