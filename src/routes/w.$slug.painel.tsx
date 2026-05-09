import { createFileRoute } from "@tanstack/react-router";
import { Ticket, FolderKanban, Clock, CheckCircle2 } from "lucide-react";
import { useWorkspaceStore } from "@/estado/workspaceStore";

export const Route = createFileRoute("/w/$slug/painel")({
  component: Painel,
  head: () => ({
    meta: [{ title: "Painel | Nutricar" }],
  }),
});

const indicadores = [
  { rotulo: "Chamados abertos", valor: "0", icone: Ticket },
  { rotulo: "Resolvidos no mês", valor: "0", icone: CheckCircle2 },
  { rotulo: "Tempo médio (h)", valor: "—", icone: Clock },
  { rotulo: "Projetos ativos", valor: "0", icone: FolderKanban },
];

function Painel() {
  const { workspaceAtual } = useWorkspaceStore();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Bem-vindo(a) — {workspaceAtual?.nome}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral dos chamados, projetos e atividades da empresa.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indicadores.map((ind) => {
          const Icone = ind.icone;
          return (
            <div
              key={ind.rotulo}
              className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{ind.rotulo}</span>
                <Icone className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-3 text-3xl font-bold text-foreground">{ind.valor}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Os módulos de <strong>Chamados</strong> e <strong>Projetos</strong> serão habilitados nas próximas etapas.
        </p>
      </div>
    </div>
  );
}
