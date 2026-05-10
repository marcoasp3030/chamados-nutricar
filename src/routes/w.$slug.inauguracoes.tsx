import { createFileRoute } from "@tanstack/react-router";
import { PainelInauguracoes } from "@/paginas/inauguracoes/PainelInauguracoes";

export const Route = createFileRoute("/w/$slug/inauguracoes")({
  component: () => (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <PainelInauguracoes />
    </div>
  ),
  head: () => ({ meta: [{ title: "Inaugurações | Nutricar" }] }),
});
