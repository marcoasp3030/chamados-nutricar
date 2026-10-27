import { useMemo, useState } from "react";
import { isPast } from "date-fns";
import { AlertTriangle, Loader2, MapPin, Users } from "lucide-react";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamados } from "@/hooks/useChamados";
import { useUsuarioAtualId } from "@/auth/atual";
import {
  FiltrosPrioridade,
  type FiltroPrioridadeSuporte,
} from "@/componentes/suporte/FiltrosPrioridade";
import { ORDEM_PRIORIDADE } from "@/componentes/suporte/FaixaPrioridade";
import type { PrioridadeChamado } from "@/tipos/chamado";
import { chamadoAtivoParaSuporte, STATUS_CHAMADO_ATIVOS_SUPORTE } from "@/utilitarios/status-chamado-suporte";
import { LinhaChamadoSuporte } from "./LinhaChamadoSuporte";

function ordenarPorPrioridade<T extends { prioridade: PrioridadeChamado; criado_em: string }>(
  lista: T[],
): T[] {
  return [...lista].sort((a, b) => {
    const pa = ORDEM_PRIORIDADE[a.prioridade] ?? 9;
    const pb = ORDEM_PRIORIDADE[b.prioridade] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
  });
}

export function PainelColegasSuporte() {
  const { workspaceAtual } = useWorkspaceStore();
  const usuarioId = useUsuarioAtualId();
  const [filtroPrioridade, setFiltroPrioridade] = useState<FiltroPrioridadeSuporte>("Todas");

  const { data: chamados, isLoading } = useChamados(workspaceAtual?.id, {
    statusIn: STATUS_CHAMADO_ATIVOS_SUPORTE,
    somenteRaiz: true,
  });

  const resumo = useMemo(() => {
    const colegas = (chamados ?? []).filter(
      (c) =>
        c.responsavel_id &&
        c.responsavel_id !== usuarioId &&
        chamadoAtivoParaSuporte(c.status),
    );

    const contagensPrioridade: Record<FiltroPrioridadeSuporte, number> = {
      Todas: colegas.length,
      Urgente: colegas.filter((c) => c.prioridade === "Urgente").length,
      Alta: colegas.filter((c) => c.prioridade === "Alta").length,
      Media: colegas.filter((c) => c.prioridade === "Media").length,
      Baixa: colegas.filter((c) => c.prioridade === "Baixa").length,
    };

    const filtrados =
      filtroPrioridade === "Todas"
        ? colegas
        : colegas.filter((c) => c.prioridade === filtroPrioridade);

    const vencidos = colegas.filter((c) => c.prazo && isPast(new Date(c.prazo)));

    return {
      colegas: ordenarPorPrioridade(filtrados),
      contagensPrioridade,
      vencidos: vencidos.length,
    };
  }, [chamados, usuarioId, filtroPrioridade]);

  if (!workspaceAtual) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <header className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Chamados da equipe</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Chamados abertos com outros técnicos do seu departamento. Abra e use{" "}
              <strong className="font-medium text-foreground">Assumir chamado</strong> se estiver
              perto da loja e puder ajudar.
            </p>
          </div>
        </div>
      </header>

      {resumo.contagensPrioridade.Todas > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Com colegas
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                {resumo.contagensPrioridade.Todas}
              </p>
            </div>
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 shadow-sm">
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                Vencidos
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-red-600 dark:text-red-400">
                {resumo.vencidos}
              </p>
            </div>
          </div>

          <section className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Filtrar por prioridade
            </h2>
            <FiltrosPrioridade
              valor={filtroPrioridade}
              contagens={resumo.contagensPrioridade}
              onChange={setFiltroPrioridade}
            />
          </section>
        </>
      )}

      {resumo.colegas.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {filtroPrioridade === "Todas"
              ? "Abertos com a equipe"
              : `Prioridade ${filtroPrioridade === "Media" ? "Média" : filtroPrioridade}`}
          </h2>
          <div className="space-y-2">
            {resumo.colegas.map((c) => (
              <LinhaChamadoSuporte
                key={c.id}
                chamado={c}
                slug={workspaceAtual.slug}
                mostrarResponsavel
              />
            ))}
          </div>
        </section>
      ) : resumo.contagensPrioridade.Todas > 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum chamado da equipe com esta prioridade no momento.
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Nenhum chamado com colegas agora</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Quando outro técnico do seu departamento tiver chamado aberto, ele aparecerá aqui para
            você poder assumir se estiver próximo da loja.
          </p>
        </div>
      )}
    </div>
  );
}
