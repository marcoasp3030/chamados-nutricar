import { createFileRoute } from "@tanstack/react-router";
import { PainelSuporte } from "@/paginas/suporte/PainelSuporte";

export const Route = createFileRoute("/w/$slug/suporte/")({
  component: PainelSuporte,
});
