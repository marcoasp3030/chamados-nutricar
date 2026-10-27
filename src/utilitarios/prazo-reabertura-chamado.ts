import { addDays, differenceInCalendarDays } from "date-fns";

export const PRAZO_REABERTURA_DIAS = 5;

export function prazoLimiteReabertura(resolvidoEm: string | null | undefined): Date | null {
  if (!resolvidoEm) return null;
  return addDays(new Date(resolvidoEm), PRAZO_REABERTURA_DIAS);
}

export function podeReabrirChamado(
  status: string,
  resolvidoEm: string | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (status !== "Resolvido") return false;
  const limite = prazoLimiteReabertura(resolvidoEm);
  return !!limite && agora < limite;
}

export function diasRestantesReabertura(
  resolvidoEm: string | null | undefined,
  agora: Date = new Date(),
): number {
  const limite = prazoLimiteReabertura(resolvidoEm);
  if (!limite) return 0;
  const restantes = differenceInCalendarDays(limite, agora);
  return Math.max(0, restantes);
}
