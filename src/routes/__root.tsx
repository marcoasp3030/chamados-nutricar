import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import {
  ehErroCarregamentoChunk,
  tentarRecarregarPosDeploy,
} from "@/lib/detectar-erro-carregamento";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[erro-rota]", error);
  const router = useRouter();
  const chunkDesatualizado = ehErroCarregamentoChunk(error);

  useEffect(() => {
    if (chunkDesatualizado) tentarRecarregarPosDeploy();
  }, [chunkDesatualizado]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {chunkDesatualizado
            ? "O sistema foi atualizado. Recarregue a página (Ctrl+F5) para continuar."
            : "Ocorreu um problema da nossa parte. Você pode tentar atualizar a página ou voltar para a página inicial."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (chunkDesatualizado) {
                window.location.reload();
                return;
              }
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tente novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Chamados NUTRICAR" },
      {
        name: "description",
        content:
          "Sistema NUTRICAR para gestão de chamados, projetos, checklists e processos internos.",
      },
      { name: "author", content: "NUTRICAR" },
      { property: "og:title", content: "Chamados NUTRICAR" },
      {
        property: "og:description",
        content: "Gestão de chamados, projetos, checklists e processos internos da NUTRICAR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Chamados NUTRICAR" },
      {
        name: "twitter:description",
        content: "Gestão de chamados, projetos, checklists e processos internos da NUTRICAR.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const tratar = (motivo: unknown) => {
      if (!ehErroCarregamentoChunk(motivo)) return;
      tentarRecarregarPosDeploy();
    };

    const onRejeicao = (event: PromiseRejectionEvent) => tratar(event.reason);
    const onErro = (event: ErrorEvent) => tratar(event.error ?? event.message);

    window.addEventListener("unhandledrejection", onRejeicao);
    window.addEventListener("error", onErro);
    return () => {
      window.removeEventListener("unhandledrejection", onRejeicao);
      window.removeEventListener("error", onErro);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
