import { createFileRoute } from "@tanstack/react-router";
import { ListaChamados } from "@/paginas/chamados/ListaChamados";
import type { PrioridadeChamado, StatusChamado } from "@/tipos/chamado";

export type PainelPeriodo = "todos" | "mes" | "vencidos";

export interface ChamadosSearch {
  status?: StatusChamado | "Todos";
  statusIn?: string;
  prioridade?: PrioridadeChamado | "Todas";
  responsavel?: "Todos" | "MEUS";
  periodo?: "todos" | "mes";
  campoData?: "criado_em" | "atualizado_em" | "prazo" | "fechado_em" | "resolvido_em";
  vencidos?: boolean;
  encerrados?: boolean;
  categoria?: string;
  departamento?: string;
}

const CAMPOS_DATA_VALIDOS = [
  "criado_em",
  "atualizado_em",
  "prazo",
  "fechado_em",
  "resolvido_em",
] as const;

export const Route = createFileRoute("/w/$slug/chamados/")({
  component: ListaChamados,
  validateSearch: (search: Record<string, unknown>): ChamadosSearch => ({
    status: search.status as ChamadosSearch["status"],
    statusIn: typeof search.statusIn === "string" ? search.statusIn : undefined,
    prioridade: search.prioridade as ChamadosSearch["prioridade"],
    responsavel: search.responsavel as ChamadosSearch["responsavel"],
    periodo: search.periodo as ChamadosSearch["periodo"],
    campoData: CAMPOS_DATA_VALIDOS.includes(search.campoData as (typeof CAMPOS_DATA_VALIDOS)[number])
      ? (search.campoData as ChamadosSearch["campoData"])
      : undefined,
    vencidos: search.vencidos === true || search.vencidos === "true",
    encerrados: search.encerrados === true || search.encerrados === "true",
    categoria: search.categoria as string | undefined,
    departamento: search.departamento as string | undefined,
  }),
});
