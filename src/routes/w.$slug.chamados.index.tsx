import { createFileRoute } from "@tanstack/react-router";
import { ListaChamados } from "@/paginas/chamados/ListaChamados";
import type { PrioridadeChamado, StatusChamado } from "@/tipos/chamado";

export type PainelPeriodo = "todos" | "mes" | "vencidos";

export interface ChamadosSearch {
  status?: StatusChamado | "Todos";
  prioridade?: PrioridadeChamado | "Todas";
  responsavel?: "Todos" | "MEUS";
  periodo?: "todos" | "mes";
  vencidos?: boolean;
}

export const Route = createFileRoute("/w/$slug/chamados/")({
  component: ListaChamados,
  validateSearch: (search: Record<string, unknown>): ChamadosSearch => ({
    status: search.status as ChamadosSearch["status"],
    prioridade: search.prioridade as ChamadosSearch["prioridade"],
    responsavel: search.responsavel as ChamadosSearch["responsavel"],
    periodo: search.periodo as ChamadosSearch["periodo"],
    vencidos: search.vencidos === true || search.vencidos === "true",
  }),
});
