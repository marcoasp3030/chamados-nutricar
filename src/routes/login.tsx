import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import logo from "@/assets/nutricar-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { entrarComSenha, obterSessao } from "@/auth/atual";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar | Nutricar" },
      { name: "description", content: "Acesse o sistema Nutricar de chamados, tarefas e processos." },
    ],
  }),
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "A senha deve ter ao menos 6 caracteres" }).max(100),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      const msg =
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message;
      setErrors({ form: msg });
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/" });
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-soft)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card/80 shadow-[var(--shadow-elegant)] backdrop-blur-xl md:grid-cols-2">
          <aside
            className="relative hidden flex-col justify-between p-10 text-primary-foreground md:flex"
            style={{ background: "var(--gradient-primary)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <img src={logo} alt="Nutricar" className="h-8 w-auto object-contain" />
              </div>
              <span className="text-lg font-semibold tracking-wide">Nutricar</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold leading-tight">
                Gestão inteligente de chamados, tarefas e processos.
              </h1>
              <p className="text-sm text-primary-foreground/85">
                Centralize demandas, acompanhe o fluxo das equipes e entregue resultados com mais clareza e agilidade.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-primary-foreground/75">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
              Plataforma interna Nutricar
            </div>
          </aside>

          <section className="flex flex-col justify-center p-8 sm:p-12">
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <img src={logo} alt="Nutricar" className="h-10 w-auto" />
            </div>

            <header className="mb-8">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Bem-vindo de volta</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Acesse sua conta para continuar.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu.email@nutricar.com"
                    className="h-11 pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/login" className="text-xs font-medium text-primary-deep hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                  Manter-me conectado
                </Label>
              </div>

              {errors.form && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errors.form}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full text-base font-semibold shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} Nutricar. Todos os direitos reservados.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
