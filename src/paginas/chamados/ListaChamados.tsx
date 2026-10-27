import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar as CalendarIcon,
  CheckCircle2,
  CircleDot,
  Eye,
  GitBranch,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Timer,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamados, type FiltrosChamados } from "@/hooks/useChamados";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { useCategoriasChamado } from "@/componentes/configuracoes/AbaCategorias";
import { useDepartamentos } from "@/componentes/configuracoes/AbaDepartamentos";
import { useUsuarioAtualId } from "@/auth/atual";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import { ChamadoDetalheRapido } from "@/componentes/chamados/ChamadoDetalheRapido";
import {
  DialogAtribuirTecnico,
  type DadosAtribuicaoTecnico,
} from "@/componentes/chamados/DialogAtribuirTecnico";
import { montarCamposAtribuicaoTecnico } from "@/utilitarios/atribuir-chamado-tecnico";
import { ehPapelSuporte } from "@/lib/papel-acesso";
import { CheckboxPropostaCriada } from "@/componentes/chamados/CheckboxPropostaCriada";
import { MenuColunasListaChamados } from "@/componentes/chamados/MenuColunasListaChamados";
import { CabecalhoColunaRedimensionavel } from "@/componentes/chamados/CabecalhoColunaRedimensionavel";
import { usaFlagPropostaCriada } from "@/utilitarios/categorias-projetos";
import {
  ordenarColunasVisiveisLista,
  somarLargurasColunas,
} from "@/utilitarios/colunas-lista-chamados";
import {
  PRIORIDADES_CHAMADO,
  STATUS_CHAMADO,
  type ChamadoComPessoas,
  type PrioridadeChamado,
  type StatusChamado,
} from "@/tipos/chamado";
import { rotuloPrioridade, rotuloStatusChamado } from "@/utilitarios/traducoes";
import { cn } from "@/lib/utils";
import { db } from "@/dados/atual";
import { useColunasListaChamados } from "@/hooks/useColunasListaChamados";

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
  categoria: "Todas",
  somenteRaiz: false,
  propostaCriada: "todos",
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
  resolvido_em: "Resolução",
};

function parseStatusIn(raw?: string): StatusChamado[] | undefined {
  if (!raw?.trim()) return undefined;
  const partes = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return partes.length > 0 ? (partes as StatusChamado[]) : undefined;
}

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
  const search = useSearch({ strict: false }) as {
    status?: StatusChamado | "Todos";
    statusIn?: string;
    prioridade?: PrioridadeChamado | "Todas";
    responsavel?: "Todos" | "MEUS";
    periodo?: "todos" | "mes";
    campoData?: FiltrosChamados["campoData"];
    vencidos?: boolean;
    encerrados?: boolean;
    categoria?: string;
    departamento?: string;
    incluirSubchamados?: boolean;
    proposta?: "todos" | "com" | "sem";
  };

  // Inicializa filtros já considerando os parâmetros de URL para evitar
  // refetch duplicado e flicker entre o primeiro render e o useEffect.
  const [filtros, setFiltros] = useState<FiltrosChamados>(() => {
    const base: FiltrosChamados = { ...FILTROS_INICIAIS };
    const statusIn = parseStatusIn(search?.statusIn);
    if (statusIn?.length) {
      base.statusIn = statusIn;
      base.status = "Todos";
    } else if (search?.status) {
      base.status = search.status;
    }
    if (search?.prioridade) base.prioridade = search.prioridade;
    if (search?.responsavel) base.responsavel_id = search.responsavel;
    if (search?.categoria) base.categoria = search.categoria;
    if (search?.departamento) base.departamento_id = search.departamento;
    if (search?.campoData) base.campoData = search.campoData;
    if (search?.periodo === "mes") {
      const { inicio, fim } = intervaloPeriodo("mes");
      base.dataInicio = inicio?.toISOString();
      base.dataFim = fim?.toISOString();
    }
    if (search?.incluirSubchamados === false) base.somenteRaiz = true;
    if (search?.proposta) base.propostaCriada = search.proposta;
    return base;
  });
  const [periodo, setPeriodo] = useState<Periodo>(() =>
    search?.periodo === "mes" ? "mes" : "todos",
  );
  const [intervaloCustom, setIntervaloCustom] = useState<{ from?: Date; to?: Date }>({});
  const [popoverDataAberto, setPopoverDataAberto] = useState(false);
  const [somenteVencidos, setSomenteVencidos] = useState<boolean>(() => !!search?.vencidos);
  const [incluirEncerrados, setIncluirEncerrados] = useState(() => !!search?.encerrados);
  // "Meus chamados": mostra apenas os chamados ABERTOS pelo usuário logado
  // (solicitante), independentemente do departamento.
  const [somenteMeus, setSomenteMeus] = useState(false);
  const [chamadoDetalhe, setChamadoDetalhe] = useState<ChamadoComPessoas | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [dialogAtribuirMassa, setDialogAtribuirMassa] = useState(false);
  const queryClient = useQueryClient();
  const [ordenacao, setOrdenacao] = useState<{
    campo: "prioridade" | "sla" | "criado" | "atualizado" | "loja" | null;
    direcao: "asc" | "desc";
  }>({ campo: null, direcao: "desc" });

  const podeGerenciarAtribuicao =
    !!workspaceAtual &&
    !ehPapelSuporte(workspaceAtual.papel) &&
    ["Proprietario", "Administrador", "Gestor", "Atendente"].includes(workspaceAtual.papel);

  const podeMarcarProposta = podeGerenciarAtribuicao;

  const { colunas: colunasVisiveis, larguras, alternarColuna, redimensionarColuna, restaurarPadrao } =
    useColunasListaChamados(workspaceAtual?.slug);

  const colunasOrdenadas = useMemo(
    () => ordenarColunasVisiveisLista(colunasVisiveis, podeGerenciarAtribuicao),
    [colunasVisiveis, podeGerenciarAtribuicao],
  );

  const larguraTabela = useMemo(
    () => somarLargurasColunas(colunasOrdenadas, larguras),
    [colunasOrdenadas, larguras],
  );

  function alternarOrdenacao(campo: "prioridade" | "sla" | "criado" | "atualizado" | "loja") {
    setOrdenacao((atual) => {
      if (atual.campo !== campo) {
        return { campo, direcao: "desc" };
      }
      if (atual.direcao === "desc") return { campo, direcao: "asc" };
      return { campo: null, direcao: "desc" };
    });
  }

  // Sincroniza quando o usuário muda apenas a URL (navegação posterior)
  useEffect(() => {
    const statusIn = parseStatusIn(search.statusIn);
    setFiltros((f) => ({
      ...f,
      status: statusIn?.length ? "Todos" : (search.status ?? f.status),
      statusIn: statusIn?.length ? statusIn : undefined,
      prioridade: search.prioridade ?? f.prioridade,
      responsavel_id: search.responsavel ?? f.responsavel_id,
      categoria: search.categoria ?? f.categoria,
      departamento_id: search.departamento ?? f.departamento_id,
      campoData: search.campoData ?? f.campoData,
    }));
    if (search.periodo === "mes") {
      setPeriodo("mes");
      const { inicio, fim } = intervaloPeriodo("mes");
      setFiltros((f) => ({
        ...f,
        dataInicio: inicio?.toISOString(),
        dataFim: fim?.toISOString(),
      }));
    }
    if (search.vencidos) setSomenteVencidos(true);
    if (search.encerrados) setIncluirEncerrados(true);
    if (search.incluirSubchamados === false) {
      setFiltros((f) => ({ ...f, somenteRaiz: true }));
    } else if (search.incluirSubchamados) {
      setFiltros((f) => ({ ...f, somenteRaiz: false }));
    }
    if (search.proposta) {
      setFiltros((f) => ({ ...f, propostaCriada: search.proposta }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search.status,
    search.statusIn,
    search.prioridade,
    search.responsavel,
    search.periodo,
    search.campoData,
    search.vencidos,
    search.encerrados,
    search.categoria,
    search.departamento,
    search.incluirSubchamados,
    search.proposta,
  ]);

  const { data: dadosBrutos, isLoading } = useChamados(workspaceAtual?.id, filtros);
  const { data: membros } = useMembrosWorkspace(workspaceAtual?.id);
  const { data: categorias } = useCategoriasChamado(workspaceAtual?.id);
  const { data: departamentos } = useDepartamentos(workspaceAtual?.id);
  const usuarioId = useUsuarioAtualId();

  // Lista de responsáveis do filtro = apenas quem é responsável por algum chamado
  // que o usuário vê (respeitando os demais filtros). Para não "sumir" com as
  // opções ao escolher um responsável, buscamos ignorando o próprio filtro de
  // responsável (mesma queryKey quando = "Todos", então não há fetch extra).
  const filtrosParaOpcoes = useMemo<FiltrosChamados>(
    () => ({ ...filtros, responsavel_id: "Todos" }),
    [filtros],
  );
  const { data: chamadosParaOpcoes } = useChamados(workspaceAtual?.id, filtrosParaOpcoes);

  const STATUS_ENCERRADOS = useMemo(
    () => new Set<StatusChamado>(["Fechado", "Cancelado", "Resolvido"]),
    [],
  );

  const responsaveisDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of chamadosParaOpcoes ?? []) {
      // Por padrão considera só os chamados não encerrados (os "abertos no perfil").
      if (!incluirEncerrados && STATUS_ENCERRADOS.has(c.status)) continue;
      if (!c.responsavel_id) continue;
      mapa.set(c.responsavel_id, c.responsavel?.nome ?? "Responsável");
    }
    return [...mapa.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [chamadosParaOpcoes, incluirEncerrados, STATUS_ENCERRADOS]);

  // Mapa id → nome de departamento (para a coluna "Departamento responsável").
  const mapaDepartamentos = useMemo(
    () => new Map((departamentos ?? []).map((d) => [d.id, d.nome])),
    [departamentos],
  );

  // Departamentos aos quais o usuário logado está atrelado.
  const meuMembro = (membros ?? []).find((m) => m.usuario_id === usuarioId);
  const meusDeptoIds = meuMembro?.departamento_ids ?? [];
  const meusDepartamentos = (departamentos ?? []).filter((d) =>
    meusDeptoIds.includes(d.id),
  );
  // Só faz sentido oferecer o seletor quando o usuário pertence a 2+ departamentos.
  const mostrarFiltroDepto = meusDepartamentos.length > 1;

  // Nome do responsável escolhido (para exibir no chip de filtro ativo).
  const nomeResponsavelFiltro =
    filtros.responsavel_id &&
    filtros.responsavel_id !== "Todos" &&
    filtros.responsavel_id !== "MEUS"
      ? responsaveisDisponiveis.find((r) => r.id === filtros.responsavel_id)?.nome ??
        (membros ?? []).find((m) => m.usuario_id === filtros.responsavel_id)?.perfil.nome
      : undefined;
  const nomeDepartamentoFiltro =
    filtros.departamento_id && filtros.departamento_id !== "Todos"
      ? (departamentos ?? []).find((d) => d.id === filtros.departamento_id)?.nome
      : undefined;

  // Conjunto de chamados que possuem subchamados (para mostrar indicador na tabela)
  const { data: idsComSubchamados } = useQuery({
    queryKey: ["chamados-com-subs", workspaceAtual?.id],
    enabled: !!workspaceAtual?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await db
        .from("chamados")
        .select("chamado_pai_id")
        .eq("workspace_id", workspaceAtual!.id)
        .not("chamado_pai_id", "is", null);
      return new Set((data ?? []).map((d) => d.chamado_pai_id as string));
    },
  });

  // Quantidade de anexos por chamado (ícone na listagem).
  const { data: contagemAnexos } = useQuery({
    queryKey: ["chamados-contagem-anexos", workspaceAtual?.id],
    enabled: !!workspaceAtual?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("chamado_anexos")
        .select("chamado_id")
        .eq("workspace_id", workspaceAtual!.id);
      if (error) throw error;
      const mapa = new Map<string, number>();
      for (const row of data ?? []) {
        const id = row.chamado_id as string;
        mapa.set(id, (mapa.get(id) ?? 0) + 1);
      }
      return mapa;
    },
  });

  const data = useMemo(() => {
    if (!dadosBrutos) return dadosBrutos;
    let lista = dadosBrutos;
    // Por padrão, oculta encerrados — exceto se o usuário escolheu um status
    // específico encerrado, marcou "incluir encerrados" ou está filtrando vencidos.
    const statusEspecificoEncerrado =
      filtros.status && filtros.status !== "Todos" && STATUS_ENCERRADOS.has(filtros.status as StatusChamado);
    if (!incluirEncerrados && !statusEspecificoEncerrado && !somenteVencidos) {
      lista = lista.filter((c) => !STATUS_ENCERRADOS.has(c.status));
    }
    // "Meus chamados": apenas os que o usuário logado abriu (solicitante).
    if (somenteMeus && usuarioId) {
      lista = lista.filter((c) => c.solicitante_id === usuarioId);
    }
    if (somenteVencidos) {
      const agora = new Date();
      lista = lista.filter(
        (c) =>
          c.prazo &&
          new Date(c.prazo) < agora &&
          c.status !== "Fechado" &&
          c.status !== "Cancelado" &&
          c.status !== "Resolvido",
      );
    }
    if (filtros.propostaCriada && filtros.propostaCriada !== "todos") {
      lista = lista.filter((c) => {
        if (!usaFlagPropostaCriada(c)) return false;
        const marcado = !!c.proposta_criada;
        return filtros.propostaCriada === "com" ? marcado : !marcado;
      });
    }
    if (ordenacao.campo) {
      const pesoPrioridade: Record<PrioridadeChamado, number> = {
        Urgente: 4,
        Alta: 3,
        Media: 2,
        Baixa: 1,
      };
      const sinal = ordenacao.direcao === "desc" ? -1 : 1;
      lista = [...lista].sort((a, b) => {
        if (ordenacao.campo === "loja") {
          const la = (a.loja ?? "").localeCompare(b.loja ?? "", "pt-BR", { sensitivity: "base" });
          return ordenacao.direcao === "asc" ? la : -la;
        }
        if (ordenacao.campo === "prioridade") {
          return sinal * (pesoPrioridade[a.prioridade] - pesoPrioridade[b.prioridade]);
        }
        if (ordenacao.campo === "criado") {
          const ta = new Date(a.criado_em).getTime();
          const tb = new Date(b.criado_em).getTime();
          return sinal === -1 ? tb - ta : ta - tb;
        }
        if (ordenacao.campo === "atualizado") {
          const ta = new Date(a.atualizado_em).getTime();
          const tb = new Date(b.atualizado_em).getTime();
          return sinal === -1 ? tb - ta : ta - tb;
        }
        // SLA: vencidos primeiro (desc) — quanto mais vencido, mais ao topo.
        // Sem prazo vai para o fim em ambas direções.
        const ta = a.prazo ? new Date(a.prazo).getTime() : null;
        const tb = b.prazo ? new Date(b.prazo).getTime() : null;
        if (ta === null && tb === null) return 0;
        if (ta === null) return 1;
        if (tb === null) return -1;
        return sinal === -1 ? ta - tb : tb - ta;
      });
    }
    return lista;
  }, [
    dadosBrutos,
    somenteVencidos,
    incluirEncerrados,
    somenteMeus,
    usuarioId,
    filtros.status,
    filtros.propostaCriada,
    ordenacao,
    STATUS_ENCERRADOS,
  ]);

  const idsVisiveis = useMemo(() => (data ?? []).map((c) => c.id), [data]);
  const todosVisiveisSelecionados =
    idsVisiveis.length > 0 && idsVisiveis.every((id) => selecionados.has(id));
  const algunsVisiveisSelecionados =
    idsVisiveis.some((id) => selecionados.has(id)) && !todosVisiveisSelecionados;

  function alternarSelecao(id: string, marcado: boolean) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (marcado) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  }

  function alternarSelecionarTodosVisiveis(marcado: boolean) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      for (const id of idsVisiveis) {
        if (marcado) proximo.add(id);
        else proximo.delete(id);
      }
      return proximo;
    });
  }

  const atribuirEmMassa = useMutation({
    mutationFn: async ({ tecnicoId, dataExecucao }: DadosAtribuicaoTecnico) => {
      const itens = (data ?? []).filter((c) => selecionados.has(c.id));
      if (itens.length === 0) throw new Error("Nenhum chamado selecionado");
      const erros: string[] = [];
      for (const chamado of itens) {
        const campos = montarCamposAtribuicaoTecnico(tecnicoId, chamado.status, dataExecucao);
        const { error } = await db.from("chamados").update(campos).eq("id", chamado.id);
        if (error) erros.push(chamado.codigo ?? `#${chamado.numero}`);
      }
      if (erros.length > 0) {
        throw new Error(`Falha em ${erros.length} chamado(s): ${erros.slice(0, 3).join(", ")}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
      setSelecionados(new Set());
      setDialogAtribuirMassa(false);
      toast.success("Chamados atribuídos ao técnico.");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível concluir a atribuição.", { description: e.message }),
  });

  useEffect(() => {
    setSelecionados(new Set());
  }, [workspaceAtual?.id, filtros, somenteVencidos, somenteMeus, incluirEncerrados]);

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
    setSomenteVencidos(false);
    setIncluirEncerrados(false);
    setSomenteMeus(false);
  }

  const indicadores = useMemo(() => {
    const lista = data ?? [];
    const ativos = lista.filter(
      (c) => c.status !== "Fechado" && c.status !== "Cancelado" && c.status !== "Resolvido",
    );
    // Resolvidos são contados a partir do conjunto bruto (respeita os filtros de
    // servidor, mas ignora a ocultação de encerrados da visão padrão), aplicando
    // também o recorte "Meus chamados" quando ativo, para o número fazer sentido.
    const brutos = (dadosBrutos ?? []).filter(
      (c) => !somenteMeus || !usuarioId || c.solicitante_id === usuarioId,
    );
    return {
      total: lista.length,
      abertos: lista.filter((c) => c.status === "Aberto").length,
      andamento: lista.filter((c) => c.status === "Em andamento").length,
      resolvidos: brutos.filter((c) => c.status === "Resolvido").length,
      atrasados: ativos.filter((c) => c.prazo && isPast(new Date(c.prazo))).length,
    };
  }, [data, dadosBrutos, somenteMeus, usuarioId]);

  const temFiltro =
    (filtros.busca && filtros.busca.length > 0) ||
    filtros.status !== "Todos" ||
    filtros.prioridade !== "Todas" ||
    (filtros.responsavel_id && filtros.responsavel_id !== "Todos") ||
    (filtros.categoria && filtros.categoria !== "Todas") ||
    (filtros.departamento_id && filtros.departamento_id !== "Todos") ||
    periodo !== "todos" ||
    !!filtros.dataInicio ||
    !!filtros.dataFim ||
    somenteVencidos ||
    somenteMeus ||
    !!filtros.somenteRaiz ||
    (filtros.propostaCriada && filtros.propostaCriada !== "todos");

  if (!workspaceAtual) return null;

  // Aplica um status como "visão" rápida (clicando no cartão de KPI).
  function verStatus(status: StatusChamado | "Todos") {
    setSomenteVencidos(false);
    setFiltros((f) => ({ ...f, status }));
  }

  const statusAtual = filtros.status ?? "Todos";
  const cards = [
    {
      label: "Total",
      valor: indicadores.total,
      icone: CircleDot,
      cor: "text-foreground",
      ativo: statusAtual === "Todos" && !somenteVencidos,
      onClick: () => verStatus("Todos"),
    },
    {
      label: "Abertos",
      valor: indicadores.abertos,
      icone: CircleDot,
      cor: "text-blue-600 dark:text-blue-400",
      ativo: statusAtual === "Aberto" && !somenteVencidos,
      onClick: () => verStatus("Aberto"),
    },
    {
      label: "Em andamento",
      valor: indicadores.andamento,
      icone: Timer,
      cor: "text-amber-600 dark:text-amber-400",
      ativo: statusAtual === "Em andamento" && !somenteVencidos,
      onClick: () => verStatus("Em andamento"),
    },
    {
      label: "Resolvidos",
      valor: indicadores.resolvidos,
      icone: CheckCircle2,
      cor: "text-emerald-600 dark:text-emerald-400",
      ativo: statusAtual === "Resolvido" && !somenteVencidos,
      onClick: () => verStatus("Resolvido"),
    },
    {
      label: "Atrasados",
      valor: indicadores.atrasados,
      icone: AlertTriangle,
      cor: "text-red-600 dark:text-red-400",
      ativo: somenteVencidos,
      onClick: () => {
        setFiltros((f) => ({ ...f, status: "Todos" }));
        setSomenteVencidos(true);
      },
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs / visões rápidas (clicáveis) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const Icone = c.icone;
          return (
            <button
              key={c.label}
              type="button"
              onClick={c.onClick}
              aria-pressed={c.ativo}
              title={`Ver ${c.label.toLowerCase()}`}
              className={cn(
                "rounded-xl border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
                c.ativo ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                <Icone className={cn("h-4 w-4", c.cor)} />
              </div>
              <p className={cn("mt-1 text-2xl font-semibold tracking-tight", c.cor)}>
                {c.valor}
              </p>
            </button>
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
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os responsáveis</SelectItem>
            <SelectItem value="MEUS">Atribuídos a mim</SelectItem>
            {responsaveisDisponiveis.length > 0 && (
              <SelectGroup>
                <SelectLabel>Responsáveis dos chamados</SelectLabel>
                {responsaveisDisponiveis.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>

        {mostrarFiltroDepto && (
          <Select
            value={filtros.departamento_id ?? "Todos"}
            onValueChange={(v) => setFiltros((f) => ({ ...f, departamento_id: v }))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os meus departamentos</SelectItem>
              {meusDepartamentos.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filtros.categoria ?? "Todas"}
          onValueChange={(v) => setFiltros((f) => ({ ...f, categoria: v }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas categorias</SelectItem>
            {(categorias ?? []).map((c) => (
              <SelectItem key={c.id} value={c.nome}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodo} onValueChange={(v) => aplicarPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[180px]">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROTULO_PERIODO) as Periodo[]).map((p) => (
              <SelectItem key={p} value={p}>
                {ROTULO_PERIODO[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.campoData ?? "criado_em"}
          onValueChange={(v) =>
            setFiltros((f) => ({ ...f, campoData: v as FiltrosChamados["campoData"] }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROTULO_CAMPO_DATA) as Array<keyof typeof ROTULO_CAMPO_DATA>).map(
              (k) => (
                <SelectItem key={k} value={k}>
                  Data: {ROTULO_CAMPO_DATA[k]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Popover open={popoverDataAberto} onOpenChange={setPopoverDataAberto}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 justify-start gap-2 font-normal",
                !filtros.dataInicio && !filtros.dataFim && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {intervaloCustom.from || filtros.dataInicio ? (
                <>
                  {format(
                    intervaloCustom.from ?? new Date(filtros.dataInicio!),
                    "dd/MM/yy",
                    { locale: ptBR },
                  )}
                  {(intervaloCustom.to || filtros.dataFim) && (
                    <>
                      {" – "}
                      {format(
                        intervaloCustom.to ?? new Date(filtros.dataFim!),
                        "dd/MM/yy",
                        { locale: ptBR },
                      )}
                    </>
                  )}
                </>
              ) : (
                <span>Intervalo personalizado</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={2}
              locale={ptBR}
              selected={{
                from: intervaloCustom.from ?? (filtros.dataInicio ? new Date(filtros.dataInicio) : undefined),
                to: intervaloCustom.to ?? (filtros.dataFim ? new Date(filtros.dataFim) : undefined),
              }}
              onSelect={(r) => aplicarCustom(r as { from?: Date; to?: Date } | undefined)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={() => setSomenteMeus((v) => !v)}
          aria-pressed={somenteMeus}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
            somenteMeus
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-muted",
          )}
          title="Mostrar apenas os chamados que você abriu"
        >
          <UserCheck className="h-4 w-4" />
          Meus chamados
        </button>

        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted">
          <Checkbox
            checked={incluirEncerrados}
            onCheckedChange={(v) => setIncluirEncerrados(!!v)}
          />
          Incluir encerrados
        </label>

        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted">
          <Checkbox
            checked={!!filtros.somenteRaiz}
            onCheckedChange={(v) => setFiltros((f) => ({ ...f, somenteRaiz: !!v }))}
          />
          Ocultar subchamados
        </label>

        <Select
          value={filtros.propostaCriada ?? "todos"}
          onValueChange={(v) =>
            setFiltros((f) => ({
              ...f,
              propostaCriada: v as "todos" | "com" | "sem",
            }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Proposta criada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Proposta: todas</SelectItem>
            <SelectItem value="com">Com proposta criada</SelectItem>
            <SelectItem value="sem">Sem proposta criada</SelectItem>
          </SelectContent>
        </Select>

        {temFiltro && (
          <Button
            variant="ghost"
            size="sm"
            onClick={limparTudo}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4" /> Limpar
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <MenuColunasListaChamados
            colunas={colunasVisiveis}
            podeSelecionarEmMassa={podeGerenciarAtribuicao}
            onAlternar={alternarColuna}
            onRestaurarPadrao={restaurarPadrao}
          />
          <Button asChild>
            <Link to="/w/$slug/chamados/novo" params={{ slug: workspaceAtual.slug }}>
              <Plus className="h-4 w-4" /> Novo chamado
            </Link>
          </Button>
        </div>
      </div>

      {/* Chips de filtros ativos */}
      {(() => {
        const chips: { key: string; label: string; onRemove: () => void }[] = [];
        if (filtros.busca && filtros.busca.length > 0) {
          chips.push({
            key: "busca",
            label: `Busca: "${filtros.busca}"`,
            onRemove: () => setFiltros((f) => ({ ...f, busca: "" })),
          });
        }
        if (filtros.status && filtros.status !== "Todos") {
          chips.push({
            key: "status",
            label: `Status: ${rotuloStatusChamado[filtros.status as StatusChamado]}`,
            onRemove: () => setFiltros((f) => ({ ...f, status: "Todos" })),
          });
        }
        if (filtros.prioridade && filtros.prioridade !== "Todas") {
          chips.push({
            key: "prioridade",
            label: `Prioridade: ${rotuloPrioridade[filtros.prioridade as PrioridadeChamado]}`,
            onRemove: () => setFiltros((f) => ({ ...f, prioridade: "Todas" })),
          });
        }
        if (filtros.responsavel_id && filtros.responsavel_id !== "Todos") {
          chips.push({
            key: "responsavel",
            label:
              filtros.responsavel_id === "MEUS"
                ? "Responsável: Atribuídos a mim"
                : `Responsável: ${nomeResponsavelFiltro ?? "definido"}`,
            onRemove: () => setFiltros((f) => ({ ...f, responsavel_id: "Todos" })),
          });
        }
        if (filtros.categoria && filtros.categoria !== "Todas") {
          chips.push({
            key: "categoria",
            label: `Categoria: ${filtros.categoria}`,
            onRemove: () => setFiltros((f) => ({ ...f, categoria: "Todas" })),
          });
        }
        if (filtros.departamento_id && filtros.departamento_id !== "Todos") {
          chips.push({
            key: "departamento",
            label: `Departamento: ${nomeDepartamentoFiltro ?? "definido"}`,
            onRemove: () => setFiltros((f) => ({ ...f, departamento_id: "Todos" })),
          });
        }
        if (periodo !== "todos") {
          const campoLabel = ROTULO_CAMPO_DATA[filtros.campoData ?? "criado_em"];
          let label = `${campoLabel}: ${ROTULO_PERIODO[periodo]}`;
          if (periodo === "personalizado" && (filtros.dataInicio || filtros.dataFim)) {
            const ini = filtros.dataInicio
              ? format(new Date(filtros.dataInicio), "dd/MM/yy", { locale: ptBR })
              : "…";
            const fim = filtros.dataFim
              ? format(new Date(filtros.dataFim), "dd/MM/yy", { locale: ptBR })
              : "…";
            label = `${campoLabel}: ${ini} – ${fim}`;
          }
          chips.push({
            key: "periodo",
            label,
            onRemove: () => {
              setPeriodo("todos");
              setIntervaloCustom({});
              setFiltros((f) => ({ ...f, dataInicio: undefined, dataFim: undefined }));
            },
          });
        }
        if (somenteVencidos) {
          chips.push({
            key: "vencidos",
            label: "Apenas vencidos",
            onRemove: () => setSomenteVencidos(false),
          });
        }
        if (somenteMeus) {
          chips.push({
            key: "meus",
            label: "Meus chamados (abertos por mim)",
            onRemove: () => setSomenteMeus(false),
          });
        }
        if (filtros.somenteRaiz) {
          chips.push({
            key: "subchamados",
            label: "Subchamados ocultos",
            onRemove: () => setFiltros((f) => ({ ...f, somenteRaiz: false })),
          });
        }
        if (filtros.propostaCriada && filtros.propostaCriada !== "todos") {
          chips.push({
            key: "proposta",
            label:
              filtros.propostaCriada === "com"
                ? "Com proposta criada"
                : "Sem proposta criada",
            onRemove: () => setFiltros((f) => ({ ...f, propostaCriada: "todos" })),
          });
        }
        if (chips.length === 0) return null;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filtros ativos:</span>
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.onRemove}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {c.label}
                <X className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>
            ))}
            <button
              type="button"
              onClick={limparTudo}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Limpar tudo
            </button>
          </div>
        );
      })()}

      {/* Barra de ações em massa */}
      {podeGerenciarAtribuicao && selecionados.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">
            {selecionados.size === 1
              ? "1 chamado selecionado"
              : `${selecionados.size} chamados selecionados`}
          </span>
          <Button size="sm" onClick={() => setDialogAtribuirMassa(true)}>
            <UserPlus className="h-4 w-4" />
            Atribuir ao técnico
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelecionados(new Set())}
            className="text-muted-foreground"
          >
            Limpar seleção
          </Button>
        </div>
      )}

      {/* Tabela — layout fixo para caber na largura sem scroll horizontal */}
      <div className="rounded-xl border border-border bg-card">
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
          <TooltipProvider delayDuration={150}>
            <div className="overflow-x-auto">
              <Table className="table-fixed" style={{ width: larguraTabela, minWidth: "100%" }}>
                <colgroup>
                  {colunasOrdenadas.map((id) => (
                    <col key={id} style={{ width: larguras[id] }} />
                  ))}
                </colgroup>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {podeGerenciarAtribuicao && colunasVisiveis.selecao && (
                      <CabecalhoColunaRedimensionavel
                        id="selecao"
                        largura={larguras.selecao}
                        onRedimensionar={redimensionarColuna}
                        redimensionavel={false}
                      >
                        <Checkbox
                          checked={
                            todosVisiveisSelecionados
                              ? true
                              : algunsVisiveisSelecionados
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={(v) => alternarSelecionarTodosVisiveis(!!v)}
                          aria-label="Selecionar todos os chamados visíveis"
                        />
                      </CabecalhoColunaRedimensionavel>
                    )}
                    {colunasVisiveis.numero && (
                      <CabecalhoColunaRedimensionavel
                        id="numero"
                        largura={larguras.numero}
                        onRedimensionar={redimensionarColuna}
                      >
                        Nº
                      </CabecalhoColunaRedimensionavel>
                    )}
                    <CabecalhoColunaRedimensionavel
                      id="chamado"
                      largura={larguras.chamado}
                      onRedimensionar={redimensionarColuna}
                    >
                      Chamado
                    </CabecalhoColunaRedimensionavel>
                    {colunasVisiveis.loja && (
                      <CabecalhoColunaRedimensionavel
                        id="loja"
                        largura={larguras.loja}
                        onRedimensionar={redimensionarColuna}
                      >
                        <button
                          type="button"
                          onClick={() => alternarOrdenacao("loja")}
                          className={cn(
                            "inline-flex max-w-full items-center gap-1 truncate rounded transition-colors hover:text-foreground",
                            ordenacao.campo === "loja" && "text-foreground",
                          )}
                          title="Ordenar por loja (A–Z)"
                        >
                          Loja
                          {ordenacao.campo === "loja" ? (
                            ordenacao.direcao === "asc" ? (
                              <ArrowUp className="h-3 w-3 shrink-0" />
                            ) : (
                              <ArrowDown className="h-3 w-3 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </CabecalhoColunaRedimensionavel>
                    )}
                    {colunasVisiveis.categoria && (
                      <CabecalhoColunaRedimensionavel
                        id="categoria"
                        largura={larguras.categoria}
                        onRedimensionar={redimensionarColuna}
                      >
                        Categoria
                      </CabecalhoColunaRedimensionavel>
                    )}
                    {colunasVisiveis.departamento && (
                      <CabecalhoColunaRedimensionavel
                        id="departamento"
                        largura={larguras.departamento}
                        onRedimensionar={redimensionarColuna}
                      >
                        Departamento
                      </CabecalhoColunaRedimensionavel>
                    )}
                    {colunasVisiveis.status && (
                      <CabecalhoColunaRedimensionavel
                        id="status"
                        largura={larguras.status}
                        onRedimensionar={redimensionarColuna}
                      >
                        Status
                      </CabecalhoColunaRedimensionavel>
                    )}
                    {colunasVisiveis.prioridade && (
                      <CabecalhoColunaRedimensionavel
                        id="prioridade"
                        largura={larguras.prioridade}
                        onRedimensionar={redimensionarColuna}
                      >
                        <button
                          type="button"
                          onClick={() => alternarOrdenacao("prioridade")}
                          className={cn(
                            "inline-flex max-w-full items-center gap-1 truncate rounded transition-colors hover:text-foreground",
                            ordenacao.campo === "prioridade" && "text-foreground",
                          )}
                        >
                          Prior.
                          {ordenacao.campo === "prioridade" ? (
                            ordenacao.direcao === "desc" ? (
                              <ArrowDown className="h-3 w-3 shrink-0" />
                            ) : (
                              <ArrowUp className="h-3 w-3 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </CabecalhoColunaRedimensionavel>
                    )}
                    {colunasVisiveis.responsavel && (
                      <CabecalhoColunaRedimensionavel
                        id="responsavel"
                        largura={larguras.responsavel}
                        onRedimensionar={redimensionarColuna}
                      >
                        Responsável
                      </CabecalhoColunaRedimensionavel>
                    )}
                    {colunasVisiveis.prazo && (
                      <CabecalhoColunaRedimensionavel
                        id="prazo"
                        largura={larguras.prazo}
                        onRedimensionar={redimensionarColuna}
                      >
                        <button
                          type="button"
                          onClick={() => alternarOrdenacao("sla")}
                          className={cn(
                            "inline-flex max-w-full items-center gap-1 truncate rounded transition-colors hover:text-foreground",
                            ordenacao.campo === "sla" && "text-foreground",
                          )}
                          title="Ordenar por SLA — vencidos primeiro"
                        >
                          Prazo
                          {ordenacao.campo === "sla" ? (
                            ordenacao.direcao === "desc" ? (
                              <ArrowDown className="h-3 w-3 shrink-0" />
                            ) : (
                              <ArrowUp className="h-3 w-3 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </CabecalhoColunaRedimensionavel>
                    )}
                    {colunasVisiveis.proposta && (
                      <CabecalhoColunaRedimensionavel
                        id="proposta"
                        largura={larguras.proposta}
                        onRedimensionar={redimensionarColuna}
                      >
                        Proposta
                      </CabecalhoColunaRedimensionavel>
                    )}
                    {colunasVisiveis.atualizado && (
                      <CabecalhoColunaRedimensionavel
                        id="atualizado"
                        largura={larguras.atualizado}
                        onRedimensionar={redimensionarColuna}
                      >
                        <button
                          type="button"
                          onClick={() => alternarOrdenacao("atualizado")}
                          className={cn(
                            "inline-flex max-w-full items-center gap-1 truncate rounded transition-colors hover:text-foreground",
                            ordenacao.campo === "atualizado" && "text-foreground",
                          )}
                          title="Ordenar por última atualização"
                        >
                          Atualizado
                          {ordenacao.campo === "atualizado" ? (
                            ordenacao.direcao === "desc" ? (
                              <ArrowDown className="h-3 w-3 shrink-0" />
                            ) : (
                              <ArrowUp className="h-3 w-3 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </CabecalhoColunaRedimensionavel>
                    )}
                    <CabecalhoColunaRedimensionavel
                      id="acoes"
                      largura={larguras.acoes}
                      onRedimensionar={redimensionarColuna}
                      redimensionavel={false}
                      className="text-right"
                    >
                      {" "}
                    </CabecalhoColunaRedimensionavel>
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
                  const temSubs = idsComSubchamados?.has(c.id);
                  const qtdAnexos = contagemAnexos?.get(c.id) ?? 0;

                  return (
                    <TableRow
                      key={c.id}
                      className={cn(
                        "group transition-colors hover:bg-muted/40",
                        selecionados.has(c.id) && "bg-primary/5",
                      )}
                    >
                      {podeGerenciarAtribuicao && colunasVisiveis.selecao && (
                        <TableCell>
                          <Checkbox
                            checked={selecionados.has(c.id)}
                            onCheckedChange={(v) => alternarSelecao(c.id, !!v)}
                            aria-label={`Selecionar chamado ${c.codigo ?? c.numero}`}
                          />
                        </TableCell>
                      )}
                      {colunasVisiveis.numero && (
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <Link
                            to="/w/$slug/chamados/$numero"
                            params={{ slug: workspaceAtual.slug, numero: String(c.numero) }}
                            className="hover:text-primary hover:underline"
                          >
                            {c.codigo ?? `#${c.numero}`}
                          </Link>
                        </TableCell>
                      )}
                      <TableCell>
                        <Link
                          to="/w/$slug/chamados/$numero"
                          params={{ slug: workspaceAtual.slug, numero: String(c.numero) }}
                          className="block min-w-0"
                        >
                          <div className="flex items-center gap-1.5 font-medium text-foreground transition-colors group-hover:text-primary">
                            <span className="truncate">{c.titulo}</span>
                            {temSubs && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                    <GitBranch className="h-3 w-3" />
                                    sub
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Possui subchamados</TooltipContent>
                              </Tooltip>
                            )}
                            {c.chamado_pai_id && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                                    <GitBranch className="h-3 w-3" />
                                    subchamado
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Subchamado vinculado a um chamado principal</TooltipContent>
                              </Tooltip>
                            )}
                            {qtdAnexos > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    <Paperclip className="h-3 w-3" />
                                    {qtdAnexos}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {qtdAnexos === 1
                                    ? "1 anexo"
                                    : `${qtdAnexos} anexos`}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                            {c.solicitante && <span>por {c.solicitante.nome}</span>}
                            {c.tipo && (
                              <>
                                {c.solicitante && <span>·</span>}
                                <span>{c.tipo}</span>
                              </>
                            )}
                            {!colunasVisiveis.numero && (
                              <>
                                <span>·</span>
                                <span className="font-mono">{c.codigo ?? `#${c.numero}`}</span>
                              </>
                            )}
                            {c.categoria && !colunasVisiveis.categoria && (
                              <>
                                <span>·</span>
                                <span>{c.categoria}</span>
                              </>
                            )}
                            {c.loja && !colunasVisiveis.loja && (
                              <>
                                <span>·</span>
                                <span className="truncate">{c.loja}</span>
                              </>
                            )}
                            {c.departamento_id &&
                              mapaDepartamentos.get(c.departamento_id) &&
                              !colunasVisiveis.departamento && (
                              <>
                                <span>·</span>
                                <span className="truncate">
                                  {mapaDepartamentos.get(c.departamento_id)}
                                </span>
                              </>
                            )}
                            {!colunasVisiveis.status && (
                              <>
                                <span>·</span>
                                <span>{rotuloStatusChamado[c.status]}</span>
                              </>
                            )}
                            {!colunasVisiveis.prioridade && (
                              <>
                                <span>·</span>
                                <span>{rotuloPrioridade[c.prioridade]}</span>
                              </>
                            )}
                            {c.responsavel && !colunasVisiveis.responsavel && (
                              <>
                                <span>·</span>
                                <span className="truncate">{c.responsavel.nome}</span>
                              </>
                            )}
                            {prazo && !colunasVisiveis.prazo && (
                              <>
                                <span>·</span>
                                <span>{format(prazo, "dd/MM/yyyy", { locale: ptBR })}</span>
                              </>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      {colunasVisiveis.loja && (
                        <TableCell>
                          {c.loja ? (
                            <span className="truncate text-sm text-foreground" title={c.loja}>
                              {c.loja}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {colunasVisiveis.categoria && (
                        <TableCell>
                          {c.categoria ? (
                            <span className="inline-flex max-w-full items-center truncate rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">
                              {c.categoria}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {colunasVisiveis.departamento && (
                        <TableCell>
                          {c.departamento_id && mapaDepartamentos.get(c.departamento_id) ? (
                            <span className="truncate text-sm text-foreground">
                              {mapaDepartamentos.get(c.departamento_id)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {colunasVisiveis.status && (
                        <TableCell>
                          <BadgeStatus status={c.status} />
                        </TableCell>
                      )}
                      {colunasVisiveis.prioridade && (
                        <TableCell>
                          <BadgePrioridade prioridade={c.prioridade} />
                        </TableCell>
                      )}
                      {colunasVisiveis.responsavel && (
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
                      )}
                      {colunasVisiveis.prazo && (
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
                                <CalendarIcon className="h-3 w-3" />
                              )}
                              {format(prazo, "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {colunasVisiveis.proposta && (
                        <TableCell>
                          {usaFlagPropostaCriada(c) ? (
                            <CheckboxPropostaCriada
                              chamadoId={c.id}
                              workspaceId={workspaceAtual.id}
                              marcado={!!c.proposta_criada}
                              podeEditar={podeMarcarProposta}
                              compacto
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {colunasVisiveis.atualizado && (
                        <TableCell className="text-xs text-muted-foreground">
                          <time dateTime={c.atualizado_em} title={`Criado em ${format(new Date(c.criado_em), "dd/MM/yyyy", { locale: ptBR })}`}>
                            {format(new Date(c.atualizado_em), "dd/MM HH:mm", {
                              locale: ptBR,
                            })}
                          </time>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setChamadoDetalhe(c)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalhes</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </TooltipProvider>
        )}
      </div>

      <ChamadoDetalheRapido
        chamado={chamadoDetalhe}
        slug={workspaceAtual.slug}
        aoFechar={() => setChamadoDetalhe(null)}
      />

      {podeGerenciarAtribuicao && (
        <DialogAtribuirTecnico
          aberto={dialogAtribuirMassa}
          aoAbrirChange={setDialogAtribuirMassa}
          membros={membros ?? []}
          quantidadeChamados={selecionados.size}
          pendente={atribuirEmMassa.isPending}
          onConfirmar={(dados) => atribuirEmMassa.mutate(dados)}
        />
      )}
    </div>
  );
}
