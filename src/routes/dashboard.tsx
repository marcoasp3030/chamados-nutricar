import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogOut, Loader2 } from "lucide-react";
import logo from "@/assets/nutricar-logo.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "Painel | Nutricar" }],
  }),
});

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate({ to: "/login" });
      } else {
        setUser(session.user);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
      } else {
        setUser(data.session.user);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Nutricar" className="h-9 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao Sistema Nutricar</h1>
          <p className="mt-2 text-muted-foreground">
            Em breve, aqui ficará o painel de chamados, tarefas e processos.
          </p>
        </div>
      </section>
    </main>
  );
}
