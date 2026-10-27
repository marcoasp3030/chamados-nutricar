import type { StatusChamado } from "@/tipos/chamado";

export const STATUS_CHAMADO_ATIVOS_SUPORTE: StatusChamado[] = [
  "Aberto",
  "Em andamento",
  "Agendado",
  "Pausado",
  "Aguardando solicitante",
  "Aguardando terceiros",
];

export function chamadoAtivoParaSuporte(status: StatusChamado) {
  return STATUS_CHAMADO_ATIVOS_SUPORTE.includes(status);
}
