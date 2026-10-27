import { useQuery } from "@tanstack/react-query";
import type { WorkspaceComPapel } from "@/tipos/workspace";

const URL_API = import.meta.env.VITE_API_URL ?? "/api";

async function fetchWorkspaces(): Promise<WorkspaceComPapel[]> {
  const resp = await fetch(`${URL_API}/workspaces/me`, { credentials: "include" });
  if (resp.status === 401) return [];
  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(msg || `HTTP ${resp.status}`);
  }
  const j = (await resp.json()) as { workspaces: WorkspaceComPapel[] };
  return j.workspaces ?? [];
}

export function useMeusWorkspaces() {
  return useQuery({
    queryKey: ["meus-workspaces"],
    queryFn: fetchWorkspaces,
    staleTime: 30_000,
    retry: 2,
  });
}

export { fetchWorkspaces as listarMinhasWorkspacesApi };

export async function buscarWorkspacePorSlug(slug: string): Promise<WorkspaceComPapel | null> {
  const resp = await fetch(`${URL_API}/workspaces/me?slug=${encodeURIComponent(slug)}`, {
    credentials: "include",
  });
  if (resp.status === 404 || resp.status === 401) return null;
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const j = (await resp.json()) as { workspace: WorkspaceComPapel };
  return j.workspace ?? null;
}
