import { useNavigate } from "@tanstack/react-router";
import { Building2, ChevronRight, Loader2, LogOut } from "lucide-react";
import logo from "@/assets/nutricar-logo.png";
import { Button } from "@/components/ui/button";
import { useMeusWorkspaces } from "@/hooks/useMeusWorkspaces";
import { rotuloPapel } from "@/utilitarios/traducoes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sair } from "@/auth/atual";

export function SelecionarWorkspace() {
  const navigate = useNavigate();
  const { data: workspaces = [], isLoading } = useMeusWorkspaces();

  const sair = async () => {
    await sair();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  };

  return (
    <main className="min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{ background: "var(--gradient-soft)" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <img src={logo} alt="Nutricar" className="h-9 w-auto" />
          <Button variant="ghost" size="sm" onClick={sair}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </header>

        <section className="mt-12">
          <h1 className="text-3xl font-bold text-foreground">Selecione uma empresa</h1>
          <p className="mt-2 text-muted-foreground">
            Você é membro das empresas abaixo. Escolha qual deseja acessar.
          </p>
        </section>

        <div className="mt-8 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && workspaces.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Nenhuma empresa vinculada
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sua conta ainda não foi adicionada a nenhuma empresa. Solicite um convite
                ao administrador.
              </p>
            </div>
          )}

          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => navigate({ to: "/w/$slug/painel", params: { slug: ws.slug } })}
              className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-primary-foreground"
                style={{ background: ws.cor_primaria }}
              >
                {ws.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{ws.nome}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {rotuloPapel[ws.papel]} · {ws.plano}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
