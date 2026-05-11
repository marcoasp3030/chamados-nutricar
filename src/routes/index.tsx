import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { obterSessao } from "@/auth/atual";

export const Route = createFileRoute("/")({
  component: PaginaInicial,
});

function PaginaInicial() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const sessao = await obterSessao().then((s) => ({ session: s.usuario ? { user: s.usuario } : null }));
      if (!sessao.session) {
        navigate({ to: "/login", replace: true });
        return;
      }

      // Busca empresas do usuário
      const { data, error } = await dados
        .from("workspace_membros")
        .select("workspace:workspaces(slug)")
        .eq("usuario_id", sessao.session.user.id)
        .eq("ativo", true);

      if (error || !data || data.length === 0) {
        navigate({ to: "/selecionar-empresa", replace: true });
        return;
      }

      if (data.length === 1) {
        const slug = (data[0] as unknown as { workspace: { slug: string } | null }).workspace?.slug;
        if (slug) {
          navigate({ to: "/w/$slug/painel", params: { slug }, replace: true });
          return;
        }
      }

      navigate({ to: "/selecionar-empresa", replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
