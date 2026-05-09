import { createFileRoute } from "@tanstack/react-router";
import { SelecionarWorkspace } from "@/paginas/workspace/SelecionarWorkspace";

export const Route = createFileRoute("/selecionar-empresa")({
  component: SelecionarWorkspace,
  head: () => ({
    meta: [{ title: "Selecionar empresa | Nutricar" }],
  }),
});
