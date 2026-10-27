import { db } from "@/dados/atual";

const ultimaManutencaoPorWorkspace = new Map<string, number>();
const INTERVALO_MS = 60_000;

/** Fecha chamados resolvidos há mais de 5 dias no workspace (idempotente). */
export async function fecharChamadosResolvidosExpirados(workspaceId: string) {
  const agora = Date.now();
  const ultima = ultimaManutencaoPorWorkspace.get(workspaceId);
  if (ultima != null && agora - ultima < INTERVALO_MS) return;

  try {
    await db.rpc("fechar_chamados_resolvidos_expirados", {
      _workspace_id: workspaceId,
    });
    ultimaManutencaoPorWorkspace.set(workspaceId, agora);
  } catch {
    // Falha silenciosa — não bloqueia a listagem.
  }
}
