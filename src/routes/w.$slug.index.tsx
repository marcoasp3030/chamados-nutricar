import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { rotaInicialPorPapel } from "@/lib/papel-acesso";

export const Route = createFileRoute("/w/$slug/")({
  component: RedirecionarPainel,
});

function RedirecionarPainel() {
  const { slug } = Route.useParams();
  const { workspaceAtual } = useWorkspaceStore();
  const navigate = useNavigate();
  useEffect(() => {
    const destino = workspaceAtual
      ? rotaInicialPorPapel(workspaceAtual.papel)
      : "/w/$slug/painel";
    navigate({ to: destino, params: { slug }, replace: true });
  }, [slug, navigate, workspaceAtual]);
  return null;
}
