import { createFileRoute } from "@tanstack/react-router";
import { PaginaInventario } from "@/paginas/inventario/PaginaInventario";

export const Route = createFileRoute("/w/$slug/inventario")({
  component: PaginaInventario,
});
