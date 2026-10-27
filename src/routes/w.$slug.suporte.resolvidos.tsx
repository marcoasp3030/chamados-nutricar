import { createFileRoute } from "@tanstack/react-router";
import { ListaResolvidosSuporte } from "@/paginas/suporte/ListaResolvidosSuporte";

export const Route = createFileRoute("/w/$slug/suporte/resolvidos")({
  component: ListaResolvidosSuporte,
  head: () => ({ meta: [{ title: "Resolvidos | Suporte | Nutricar" }] }),
});
