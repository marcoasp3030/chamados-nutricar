import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  format,
  isPast,
  differenceInDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays,
  startOfYear,
  endOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CircleDot,
  Loader2,
  Plus,
  Search,
  Timer,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamados, type FiltrosChamados } from "@/hooks/useChamados";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import {
  PRIORIDADES_CHAMADO,
  STATUS_CHAMADO,
  type PrioridadeChamado,
  type StatusChamado,
} from "@/tipos/chamado";
import { rotuloPrioridade, rotuloStatusChamado } from "@/utilitarios/traducoes";
import { cn } from "@/lib/utils";

function iniciais(nome?: string | null) {
  if (!nome) return "?";
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const FILTROS_INICIAIS: FiltrosChamados = {
  status: "Todos",
  prioridade: "Todas",
  busca: "",
  responsavel_id: "Todos",
  somenteRaiz: true,
  campoData: "criado_em",
};

type Periodo =
  | "todos"
  | "hoje"
  | "ontem"
  | "7dias"
  | "30dias"
  | "semana"
  | "mes"
  | "mes_anterior"
  | "ano"
  | "personalizado";

const ROTULO_PERIODO: Record<Periodo, string> = {
  todos: "Qualquer data",
  hoje: "Hoje",
  ontem: "Ontem",
  "7dias": "Últimos 7 dias",
  "30dias": "Últimos 30 dias",
  semana: "Esta semana",
  mes: "Este mês",
  mes_anterior: "Mês anterior",
  ano: "Este ano",
  personalizado: "Personalizado",
};

const ROTULO_CAMPO_DATA: Record<NonNullable<FiltrosChamados["campoData"]>, string> = {
  criado_em: "Criação",
  atualizado_em: "Atualização",
  prazo: "Prazo",
  fechado_em: "Fechamento",
};

function intervaloPeriodo(p: Periodo): { inicio?: Date; fim?: Date } {
  const hoje = new Date();
  switch (p) {
    case "hoje":
      return { inicio: startOfDay(hoje), fim: endOfDay(hoje) };
    case "ontem": {
      const o = subDays(hoje, 1);
      return { inicio: startOfDay(o), fim: endOfDay(o) };
    }
    case "7dias":
      return { inicio: startOfDay(subDays(hoje, 6)), fim: endOfDay(hoje) };
    case "30dias":
      return { inicio: startOfDay(subDays(hoje, 29)), fim: endOfDay(hoje) };
    case "semana":
      return {
        inicio: startOfWeek(hoje, { weekStartsOn: 1 }),
        fim: endOfWeek(hoje, { weekStartsOn: 1 }),
      };
    case "mes":
      return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
    case "mes_anterior": {
      const m = subDays(startOfMonth(hoje), 1);
      return { inicio: startOfMonth(m), fim: endOfMonth(m) };
    }
    case "ano":
      return { inicio: startOfYear(hoje), fim: endOfYear(hoje) };
    default:
      return {};
  }
}

export function ListaChamados() {
  const { workspaceAtual } = useWorkspaceStore();
  const [filtros, setFiltros] = useState<FiltrosChamados>(FILTROS_INICIAIS);
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [intervaloCustom, setIntervaloCustom] = useState<{ from?: Date; to?: Date }>({});
  const [popoverDataAberto, setPopoverDataAberto] = useState(false);

  const { data, isLoading } = useChamados(workspaceAtual?.id, filtros);

  function aplicarPeriodo(p: Periodo) {
    setPeriodo(p);
    if (p === "personalizado") return;
    const { inicio, fim } = intervaloPeriodo(p);
    setFiltros((f) => ({
      ...f,
      dataInicio: inicio?.toISOString(),
      dataFim: fim?.toISOString(),
    }));
    setIntervaloCustom({});
  }

  function aplicarCustom(range: { from?: Date; to?: Date } | undefined) {
    const r = range ?? {};
    setIntervaloCustom(r);
    setPeriodo("personalizado");
    setFiltros((f) => ({
      ...f,
      dataInicio: r.from ? startOfDay(r.from).toISOString() : undefined,
      dataFim: r.to ? endOfDay(r.to).toISOString() : undefined,
    }));
  }

  function limparTudo() {
    setFiltros(FILTROS_INICIAIS);
    setPeriodo("todos");
    setIntervaloCustom({});
  }

  const indicadores = useMemo(() => {
    const lista = data ?? [];
    const ativos = lista.filter(
      (c) => c.status !== "Fechado" && c.status !== "Cancelado" && c.status !== "Resolvido",
    );
    return {
      total: lista.length,
      abertos: lista.filter((c) => c.status === "Aberto").length,
      andamento: lista.filter((c) => c.status === "Em andamento").length,
      atrasados: ativos.filter((c) => c.prazo && isPast(new Date(c.prazo))).length,
    };
  }, [data]);

  const temFiltro =
    (filtros.busca && filtros.busca.length > 0) ||
    filtros.status !== "Todos" ||
    filtros.prioridade !== "Todas" ||
    (filtros.responsavel_id && filtros.responsavel_id !== "Todos") ||
    periodo !== "todos" ||
    !!filtros.dataInicio ||
    !!filtros.dataFim;

  if (!workspaceAtual) return null;

  const cards = [
    { label: "Total", valor: indicadores.total, icone: CircleDot, cor: "text-foreground" },
    { label: "Abertos", valor: indicadores.abertos, icone: CircleDot, cor: "text-blue-600 dark:text-blue-400" },
    { label: "Em andamento", valor: indicadores.andamento, icone: Timer, cor: "text-amber-600 dark:text-amber-400" },
    { label: "Atrasados", valor: indicadores.atrasados, icone: AlertTriangle, cor: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => {
          const Icone = c.icone;
          return (
            <div
              key={c.label}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                <Icone className={cn("h-4 w-4", c.cor)} />
              </div>
              <p className={cn("mt-1 text-2xl font-semibold tracking-tight", c.cor)}>
                {c.valor}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou número"
            value={filtros.busca ?? ""}
            onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
            className="pl-9"
          />
        </div>

        <Select
          value={filtros.status as string}
          onValueChange={(v) =>
            setFiltros((f) => ({ ...f, status: v as StatusChamado | "Todos" }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os status</SelectItem>
            {STATUS_CHAMADO.map((s) => (
              <SelectItem key={s} value={s}>
                {rotuloStatusChamado[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.prioridade as string}
          onValueChange={(v) =>
            setFiltros((f) => ({ ...f, prioridade: v as PrioridadeChamado | "Todas" }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas prioridades</SelectItem>
            {PRIORIDADES_CHAMADO.map((p) => (
              <SelectItem key={p} value={p}>
                {rotuloPrioridade[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.responsavel_id ?? "Todos"}
          onValueChange={(v) => setFiltros((f) => ({ ...f, responsavel_id: v }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os responsáveis</SelectItem>
            <SelectItem value="MEUS">Atribuídos a mim</SelectItem>
          </SelectContent>
        </Select>

        {temFiltro && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFiltros(FILTROS_INICIAIS)}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4" /> Limpar
          </Button>
        )}

        <div className="ml-auto">
          <Button asChild>
            <Link to="/w/$slug/chamados/novo" params={{ slug: workspaceAtual.slug }}>
              <Plus className="h-4 w-4" /> Novo chamado
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum chamado encontrado com os filtros atuais.
            </p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/w/$slug/chamados/novo" params={{ slug: workspaceAtual.slug }}>
                Criar o primeiro chamado
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[80px]">Nº</TableHead>
                <TableHead>Chamado</TableHead>
                <TableHead className="w-[170px]">Status</TableHead>
                <TableHead className="w-[110px]">Prioridade</TableHead>
                <TableHead className="w-[200px]">Responsável</TableHead>
                <TableHead className="w-[130px]">Prazo</TableHead>
                <TableHead className="w-[110px]">Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => {
                const prazo = c.prazo ? new Date(c.prazo) : null;
                const ativo =
                  c.status !== "Fechado" && c.status !== "Cancelado" && c.status !== "Resolvido";
                const atrasado = prazo && ativo && isPast(prazo);
                const proximo =
                  prazo && ativo && !atrasado && differenceInDays(prazo, new Date()) <= 2;

                return (
                  <TableRow key={c.id} className="group transition-colors hover:bg-muted/40">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <Link
                        to="/w/$slug/chamados/$numero"
                        params={{ slug: workspaceAtual.slug, numero: String(c.numero) }}
                        className="hover:text-primary hover:underline"
                      >
                        {c.codigo ?? `#${c.numero}`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/w/$slug/chamados/$numero"
                        params={{ slug: workspaceAtual.slug, numero: String(c.numero) }}
                        className="block"
                      >
                        <div className="font-medium text-foreground transition-colors group-hover:text-primary">
                          {c.titulo}
                        </div>
                        {c.solicitante && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            por {c.solicitante.nome}
                            {c.tipo && <> · {c.tipo}</>}
                          </div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <BadgeStatus status={c.status} />
                    </TableCell>
                    <TableCell>
                      <BadgePrioridade prioridade={c.prioridade} />
                    </TableCell>
                    <TableCell>
                      {c.responsavel ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                              {iniciais(c.responsavel.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm">{c.responsavel.nome}</span>
                        </div>
                      ) : (
                        <span className="text-sm italic text-muted-foreground">
                          Sem responsável
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {prazo ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                            atrasado
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : proximo
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {atrasado ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <Calendar className="h-3 w-3" />
                          )}
                          {format(prazo, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
