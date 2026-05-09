import { create } from "zustand";
import type { WorkspaceComPapel } from "@/tipos/workspace";

interface EstadoWorkspace {
  workspaceAtual: WorkspaceComPapel | null;
  definirWorkspace: (workspace: WorkspaceComPapel | null) => void;
  limpar: () => void;
}

export const useWorkspaceStore = create<EstadoWorkspace>((set) => ({
  workspaceAtual: null,
  definirWorkspace: (workspace) => set({ workspaceAtual: workspace }),
  limpar: () => set({ workspaceAtual: null }),
}));
