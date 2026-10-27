import type { StatusChamado } from "@/tipos/chamado";

const STATUS_ENCERRADOS = new Set<StatusChamado>(["Resolvido", "Fechado", "Cancelado"]);

export interface CamposAtribuicaoTecnico {
  responsavel_id: string;
  agendado_para?: string;
  motivo_agendamento?: string;
  status?: StatusChamado;
}

/** Monta o payload de update ao atribuir chamado(s) a um técnico. */
export function montarCamposAtribuicaoTecnico(
  tecnicoId: string,
  statusAtual: StatusChamado,
  dataExecucao?: string,
): CamposAtribuicaoTecnico {
  const campos: CamposAtribuicaoTecnico = { responsavel_id: tecnicoId };

  if (dataExecucao) {
    campos.agendado_para = new Date(dataExecucao).toISOString();
    campos.motivo_agendamento = "Data de execução definida na atribuição ao técnico.";
    if (!STATUS_ENCERRADOS.has(statusAtual)) {
      campos.status = "Agendado";
    }
  }

  return campos;
}
