/** Dispara atualização em tempo real do sino de notificações no workspace. */
export async function sinalizarNotificacoesWorkspace(workspaceId: string) {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/notificacoes/sinalizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId }),
      credentials: "include",
    });
  } catch {
    // Falha silenciosa — o polling do hook cobre como fallback.
  }
}
