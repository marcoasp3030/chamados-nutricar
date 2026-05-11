import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import logo from "@/assets/nutricar-logo.png";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { rotuloPapel } from "@/utilitarios/traducoes";
import type { PapelMembro } from "@/tipos/workspace";
import { obterSessao } from "@/auth/atual";
import { dados } from "@/dados/atual";

interface ConviteCarregado {
  id: string;
  workspace_id: string;
  email: string;
  papel: PapelMembro;
  expira_em: string;
  aceito: boolean;
  workspace: { nome: string; slug: string; cor_primaria: string } | null;
}

export function AceitarConvite({ token }: { token: string }) {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [convite, setConvite] = useState<ConviteCarregado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [emailUsuario, setEmailUsuario] = useState<string | null>(null);
  const [aceitando, setAceitando] = useState(false);

  useEffect(() => {
    (async () => {
      const sessao = await obterSessao().then((s) => ({ session: s.usuario ? { user: s.usuario } : null }));
      if (!sessao.session) {
        navigate({ to: "/login" });
        return;
      }
      setEmailUsuario(sessao.session.user.email ?? null);

      const { data, error } = await supabase
        .from("workspace_convites")
        .select("id, workspace_id, email, papel, expira_em, aceito, workspace:workspaces(nome, slug, cor_primaria)")
        .eq("token", token)
        .maybeSingle();

      if (error || !data) {
        setErro("Convite não encontrado ou já utilizado.");
        setCarregando(false);
        return;
      }
      setConvite(data as unknown as ConviteCarregado);
      setCarregando(false);
    })();
  }, [token, navigate]);

  const aceitar = async () => {
    if (!convite) return;
    setAceitando(true);

    const sessao = await obterSessao().then((s) => ({ session: s.usuario ? { user: s.usuario } : null }));
    if (!sessao.session) {
      navigate({ to: "/login" });
      return;
    }

    const { error: erroMembro } = await dados.from("workspace_membros").insert({
      workspace_id: convite.workspace_id,
      usuario_id: sessao.session.user.id,
      papel: convite.papel,
      ativo: true,
      aceito_em: new Date().toISOString(),
    });

    if (erroMembro && !erroMembro.message.includes("duplicate")) {
      toast.error("Não foi possível aceitar o convite: " + erroMembro.message);
      setAceitando(false);
      return;
    }

    await supabase
      .from("workspace_convites")
      .update({ aceito: true })
      .eq("id", convite.id);

    toast.success(`Você agora faz parte de ${convite.workspace?.nome}!`);
    if (convite.workspace?.slug) {
      navigate({ to: "/w/$slug/painel", params: { slug: convite.workspace.slug } });
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{ background: "var(--gradient-soft)" }}
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
        <div className="flex justify-center">
          <img src={logo} alt="Nutricar" className="h-10 w-auto" />
        </div>

        {carregando && (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Carregando convite...</p>
          </div>
        )}

        {erro && (
          <div className="py-8 text-center">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-lg font-semibold text-foreground">Convite inválido</h1>
            <p className="mt-2 text-sm text-muted-foreground">{erro}</p>
            <Button variant="outline" className="mt-6" onClick={() => navigate({ to: "/" })}>
              Voltar
            </Button>
          </div>
        )}

        {convite && !erro && (
          <div className="py-6 text-center">
            {convite.aceito ? (
              <>
                <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
                <h1 className="mt-4 text-lg font-semibold text-foreground">
                  Convite já aceito
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Você já faz parte de {convite.workspace?.nome}.
                </p>
              </>
            ) : new Date(convite.expira_em) < new Date() ? (
              <>
                <XCircle className="mx-auto h-10 w-10 text-destructive" />
                <h1 className="mt-4 text-lg font-semibold text-foreground">Convite expirado</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Solicite um novo convite ao administrador.
                </p>
              </>
            ) : convite.email.toLowerCase() !== (emailUsuario ?? "").toLowerCase() ? (
              <>
                <XCircle className="mx-auto h-10 w-10 text-destructive" />
                <h1 className="mt-4 text-lg font-semibold text-foreground">
                  E-mail não corresponde
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Este convite foi enviado para <strong>{convite.email}</strong>. Faça login com
                  essa conta para aceitar.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  Você foi convidado(a)
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  para entrar em <strong>{convite.workspace?.nome}</strong> como{" "}
                  <strong>{rotuloPapel[convite.papel]}</strong>.
                </p>
                <Button
                  className="mt-6 h-11 w-full text-base font-semibold"
                  onClick={aceitar}
                  disabled={aceitando}
                >
                  {aceitando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aceitando...
                    </>
                  ) : (
                    "Aceitar convite"
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
