import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageSquare,
  PartyPopper,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import {
  useInauguracoes,
  type CardInauguracao,
  type ColunaInauguracao,
} from "@/hooks/useInauguracoes";
import { useContagemComentarios } from "@/hooks/useComentariosChecklist";
import { PainelComentarios } from "@/componentes/checklists/PainelComentarios";
import { cn } from "@/lib/utils";

interface DefColuna {
  id: ColunaInauguracao;
  rotulo: string;
  descricao: string;
  ponto: string;
  topo: string;
  icone: typeof Calendar;
}

const COLUNAS: DefColuna[] = [
  {
    id: "Planejamento",
    rotulo: "Planejamento",
    descricao: "Sem data prevista",
    ponto: "bg-slate-400",
    topo: "from-slate-400/60",
    icone: Sparkles,
  },
  {
    id: "Agendado",
    rotulo: "Agendado",
    descricao: "Mais de 30 dias",
    ponto: "bg-blue-500",
    topo: "from-blue-500/60",
    icone: Calendar,
  },
  {
    id: "Proximas",
    rotulo: "Standby",
    descricao: "Nos próximos 30 dias",
    ponto: "bg-amber-500",
    topo: "from-amber-500/60",
    icone: PartyPopper,
  },
  {
    id: "Atrasadas",
    rotulo: "Atrasadas",
    descricao: "Data já passou",
    ponto: "bg-red-500",
    topo: "from-red-500/60",
    icone: AlertTriangle,
  },
  {
    id: "Inauguradas",
    rotulo: "Concluído",
    descricao: "Concluídas",
    ponto: "bg-emerald-500",
    topo: "from-emerald-500/60",
    icone: CheckCircle2,
  },
];

export function PainelInauguracoes() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useInauguracoes(workspaceAtual?.id);
  const { data: contagemComentarios } = useContagemComentarios(workspaceAtual?.id);
  const [busca, setBusca] = useState("");
  const [comentariosDe, setComentariosDe] = useState<CardInauguracao | null>(null);

  const concluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await dados
        .from("checklists")
        .update({ status: "Concluído" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inauguracoes"] });
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      toast.success("Inauguração marcada como concluída.");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível atualizar.", { description: e.message }),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (!termo) return true;
      return (
        c.nome.toLowerCase().includes(termo) ||
        (c.razaoSocial ?? "").toLowerCase().includes(termo) ||
        (c.cidadeEstado ?? "").toLowerCase().includes(termo)
      );
    });
  }, [data, busca]);

  const porColuna = useMemo(() => {
    const m = new Map<ColunaInauguracao, CardInauguracao[]>();
    COLUNAS.forEach((c) => m.set(c.id, []));
    for (const c of filtrados) m.get(c.coluna)!.push(c);
    // ordenar cada coluna por proximidade da data
    for (const def of COLUNAS) {
      const lista = m.get(def.id)!;
      lista.sort((a, b) => {
        if (def.id === "Inauguradas") {
          return b.atualizado_em.localeCompare(a.atualizado_em);
        }
        if (a.dataInauguracao && b.dataInauguracao) {
          return a.dataInauguracao.getTime() - b.dataInauguracao.getTime();
        }
        if (a.dataInauguracao) return -1;
        if (b.dataInauguracao) return 1;
        return b.atualizado_em.localeCompare(a.atualizado_em);
      });
    }
    return m;
  }, [filtrados]);

  if (!workspaceAtual) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel de inaugurações</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o ciclo completo, da implantação à inauguração de cada loja.
          </p>
        </div>
        <div className="relative min-w-[260px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por loja, razão social ou cidade"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4 xl:gap-4">
          {COLUNAS.map((def) => {
            const itens = porColuna.get(def.id) ?? [];
            const Icone = def.icone;
            return (
              <div
                key={def.id}
                className={cn(
                  "relative flex min-w-[280px] flex-1 flex-col rounded-2xl border border-border bg-muted/40",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r to-transparent",
                    def.topo,
                  )}
                  aria-hidden
                />
                <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 pt-4 pb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn("h-2.5 w-2.5 shrink-0 rounded-full", def.ponto)}
                      aria-hidden
                    />
                    <h3 className="truncate text-sm font-semibold uppercase tracking-wide">
                      {def.rotulo}
                    </h3>
                    <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
                      {itens.length}
                    </span>
                  </div>
                  <Icone className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="px-3 pt-1.5 text-[11px] text-muted-foreground">
                  {def.descricao}
                </p>

                <div className="flex-1 space-y-2 px-2 pb-3 pt-2">
                  {itens.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-xs text-muted-foreground">
                      Nenhum registro
                    </p>
                  ) : (
                    itens.map((c) => (
                      <CartaoInauguracao
                        key={c.id}
                        item={c}
                        slug={workspaceAtual.slug}
                        coluna={def.id}
                        comentarios={contagemComentarios?.get(c.id) ?? 0}
                        onComentarios={() => setComentariosDe(c)}
                        onConcluir={() => concluir.mutate(c.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={!!comentariosDe} onOpenChange={(o) => !o && setComentariosDe(null)}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="truncate text-left">
              {comentariosDe?.razaoSocial ?? comentariosDe?.nome ?? "Comentários"}
            </SheetTitle>
            <p className="text-left text-xs text-muted-foreground">
              Atualizações da equipe sobre esta inauguração
            </p>
          </SheetHeader>
          {comentariosDe && workspaceAtual && (
            <PainelComentarios
              checklistId={comentariosDe.id}
              workspaceId={workspaceAtual.id}
              nomeChecklist={comentariosDe.razaoSocial ?? comentariosDe.nome}
              className="mt-4 flex-1"
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const ESTILO_TIPO: Record<
  "Residencial" | "Corporativo" | "Evento",
  { borda: string; fundo: string; barra: string; chip: string; rotulo: string }
> = {
  Residencial: {
    borda: "border-blue-300 dark:border-blue-800",
    fundo: "bg-blue-50/70 dark:bg-blue-950/30",
    barra: "bg-blue-500",
    chip: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
    rotulo: "Residencial",
  },
  Corporativo: {
    borda: "border-purple-300 dark:border-purple-800",
    fundo: "bg-purple-50/70 dark:bg-purple-950/30",
    barra: "bg-purple-500",
    chip: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
    rotulo: "Corporativo",
  },
  Evento: {
    borda: "border-emerald-300 dark:border-emerald-800",
    fundo: "bg-emerald-50/70 dark:bg-emerald-950/30",
    barra: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
    rotulo: "Evento",
  },
};

function CartaoInauguracao({
  item,
  slug,
  coluna,
  comentarios,
  onComentarios,
  onConcluir,
}: {
  item: CardInauguracao;
  slug: string;
  coluna: ColunaInauguracao;
  comentarios: number;
  onComentarios: () => void;
  onConcluir: () => void;
}) {
  const titulo = item.razaoSocial ?? item.nome;
  const subtitulo = item.razaoSocial ? item.nome : null;
  const estilo = item.tipoCondominio ? ESTILO_TIPO[item.tipoCondominio] : null;

  return (
    <Link
      to="/w/$slug/checklists/$checklistId"
      params={{ slug, checklistId: item.id }}
      className={cn(
        "group relative block overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        estilo
          ? cn(estilo.borda, estilo.fundo, "hover:border-current")
          : "border-border hover:border-primary/40",
      )}
    >
      {estilo && (
        <span
          className={cn("absolute inset-y-0 left-0 w-1", estilo.barra)}
          aria-hidden
        />
      )}
      <div className={cn("space-y-2.5 p-3", estilo && "pl-4")}>
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug group-hover:text-primary">
              {titulo}
            </p>
            {estilo && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  estilo.chip,
                )}
              >
                {estilo.rotulo}
              </span>
            )}
          </div>
          {subtitulo && (
            <p className="truncate text-[11px] text-muted-foreground">{subtitulo}</p>
          )}
        </div>

        {item.cidadeEstado && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> <span className="truncate">{item.cidadeEstado}</span>
          </div>
        )}

        {item.dataInauguracao && isValid(item.dataInauguracao) && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">
                {format(item.dataInauguracao, "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            {item.diasRestantes !== null && coluna !== "Inauguradas" && (
              <Badge
                variant="secondary"
                className={cn(
                  "px-1.5 py-0 text-[10px]",
                  item.diasRestantes < 0 &&
                    "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
                  item.diasRestantes >= 0 &&
                    item.diasRestantes <= 7 &&
                    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
                )}
              >
                {item.diasRestantes < 0
                  ? `${Math.abs(item.diasRestantes)}d atraso`
                  : item.diasRestantes === 0
                    ? "Hoje"
                    : `${item.diasRestantes}d`}
              </Badge>
            )}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Checklist</span>
            <span className="font-semibold text-foreground">{item.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all",
                item.pct >= 80
                  ? "bg-emerald-500"
                  : item.pct >= 40
                    ? "bg-amber-500"
                    : "bg-primary",
              )}
              style={{ width: `${item.pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {item.responsavelTecnico ? (
              <>
                <User className="h-3 w-3" />
                <span className="truncate">{item.responsavelTecnico}</span>
              </>
            ) : (
              <span className="italic">Sem responsável</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onComentarios();
              }}
              className="flex items-center gap-1 rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              aria-label="Comentários"
            >
              <MessageSquare className="h-3 w-3" />
              {comentarios > 0 ? comentarios : ""}
            </button>
            {coluna !== "Inauguradas" && item.pct >= 80 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onConcluir();
                }}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
              >
                Inaugurar
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
