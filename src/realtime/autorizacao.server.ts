// Autorização de assinatura realtime: dado o nome do canal, decide se o
// usuário autenticado pode ouvir aquele canal.
//
// Convenção: canal = "<tipo>:<id>", onde <id> é workspaceId, chamadoId, etc.

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chamados } from "@/db/schema";
import { ehMembroWorkspace } from "@/db/autorizacao";

export async function autorizarCanal(
  canal: string,
  userId: string,
): Promise<boolean> {
  const idx = canal.indexOf(":");
  if (idx <= 0) return false;
  const tipo = canal.slice(0, idx);
  const id = canal.slice(idx + 1);
  if (!id) return false;

  switch (tipo) {
    case "notif":
      return ehMembroWorkspace(userId, id);
    case "ia-exec":
    case "chamado":
    case "chamado-coment": {
      const [c] = await db
        .select({ workspaceId: chamados.workspaceId })
        .from(chamados)
        .where(eq(chamados.id, id))
        .limit(1);
      if (!c) return false;
      return ehMembroWorkspace(userId, c.workspaceId);
    }
    default:
      return false;
  }
}
