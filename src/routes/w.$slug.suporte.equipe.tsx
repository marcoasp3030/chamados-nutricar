import { createFileRoute } from "@tanstack/react-router";
import { PainelColegasSuporte } from "@/paginas/suporte/PainelColegasSuporte";

export const Route = createFileRoute("/w/$slug/suporte/equipe")({
  component: PainelColegasSuporte,
  head: () => ({ meta: [{ title: "Equipe | Suporte | Nutricar" }] }),
});
