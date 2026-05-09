import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NovoChamado } from "@/paginas/chamados/NovoChamado";
import { STATUS_CHAMADO } from "@/tipos/chamado";

const buscaSchema = z.object({
  pai: z.string().optional(),
  status: z.enum(STATUS_CHAMADO as [string, ...string[]]).optional(),
});

export const Route = createFileRoute("/w/$slug/chamados/novo")({
  component: () => <NovoChamado />,
  validateSearch: buscaSchema,
  head: () => ({ meta: [{ title: "Novo chamado | Nutricar" }] }),
});
