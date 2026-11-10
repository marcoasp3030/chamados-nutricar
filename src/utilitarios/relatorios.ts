import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Chamado, PrioridadeChamado, StatusChamado, TipoChamado } from "@/tipos/chamado";
import { STATUS_CHAMADO, PRIORIDADES_CHAMADO, TIPOS_CHAMADO } from "@/tipos/chamado";
import { rotuloPrioridade, rotuloStatusChamado, rotuloTipoChamado } from "@/utilitarios/traducoes";

/* ------------------------------------------------------------------ */
/* Tipos                                                              */
/* ------------------------------------------------------------------ */

export type CampoDataRelatorio = "criado_em" | "resolvido_em" | "fechado_em" | "prazo";
export type Granularidade = "dia" | "semana" | "mes";
export type DimensaoRelatorio =
  | "status"
  | "prioridade"
  | "tipo"
  | "categoria"
  | "departamento"
  | "responsavel"
  | "solicitante"
  | "loja";

export interface FiltrosRelatorio {
  inicio: Date;
  fim: Date;
  campoData: CampoDataRelatorio;
  status: StatusChamado[];
  prioridades: PrioridadeChamado[];
  tipos: TipoChamado[];
  categorias: string[];
  departamentos: string[];
  responsaveis: string[];
  lojas: string[];
  incluirSubchamados: boolean;
}

export interface Dicionarios {
  departamentos: Map<string, string>;
  pessoas: Map<string, string>;
}

export interface ItemAgrupado {
  chave: string;
  rotulo: string;
  total: number;
  abertos: number;
  encerrados: number;
  vencidos: number;
  /** % dos chamados do grupo que estão encerrados. */
  taxaResolucao: number;
  /** Tempo médio de resolução em horas (null se nenhum resolvido). */
  tempoMedioResolucaoH: number | null;
  /** Tempo médio até a 1ª resposta em horas. */
  tempoMedio1aRespostaH: number | null;
  /** % do total filtrado. */
  participacao: number;
}

export interface PontoSerie {
  chave: string;
  rotulo: string;
  criados: number;
  resolvidos: number;
}

export interface KpisRelatorio {
  total: number;
  abertos: number;
  encerrados: number;
  vencidos: number;
  taxaResolucao: number;
  tempoMedioResolucaoH: number | null;
  tempoMedio1aRespostaH: number | null;
  /** % dos chamados com prazo que foram encerrados dentro dele. */
  cumprimentoPrazo: number | null;
  mediaPorDia: number;
}

/* ------------------------------------------------------------------ */
/* Constantes                                                         */
/* ------------------------------------------------------------------ */

export const STATUS_ENCERRADOS: StatusChamado[] = ["Resolvido", "Fechado", "Cancelado"];
const SEM_VALOR = "__sem__";

export const ROTULO_CAMPO_DATA: Record<CampoDataRelatorio, string> = {
  criado_em: "Data de abertura",
  resolvido_em: "Data de resolução",
  fechado_em: "Data de fechamento",
  prazo: "Prazo (SLA)",
};

export const ROTULO_DIMENSAO: Record<DimensaoRelatorio, string> = {
  status: "Status",
  prioridade: "Prioridade",
  tipo: "Tipo",
  categoria: "Categoria",
  departamento: "Departamento",
  responsavel: "Responsável",
  solicitante: "Solicitante",
  loja: "Loja",
};

export const PRESETS_PERIODO = [
  { id: "7d", rotulo: "7 dias" },
  { id: "30d", rotulo: "30 dias" },
  { id: "90d", rotulo: "90 dias" },
  { id: "mes", rotulo: "Este mês" },
  { id: "mes-ant", rotulo: "Mês anterior" },
  { id: "ano", rotulo: "Este ano" },
] as const;
export type PresetPeriodo = (typeof PRESETS_PERIODO)[number]["id"];

export function intervaloPreset(preset: PresetPeriodo, agora = new Date()) {
  const fim = endOfDay(agora);
  switch (preset) {
    case "7d":
      return { inicio: startOfDay(subDays(agora, 6)), fim };
    case "30d":
      return { inicio: startOfDay(subDays(agora, 29)), fim };
    case "90d":
      return { inicio: startOfDay(subDays(agora, 89)), fim };
    case "mes":
      return { inicio: startOfMonth(agora), fim };
    case "mes-ant": {
      const ref = subMonths(agora, 1);
      return { inicio: startOfMonth(ref), fim: endOfMonth(ref) };
    }
    case "ano":
      return { inicio: startOfYear(agora), fim };
  }
}

export function filtrosPadrao(): FiltrosRelatorio {
  const { inicio, fim } = intervaloPreset("30d");
  return {
    inicio,
    fim,
    campoData: "criado_em",
    status: [],
    prioridades: [],
    tipos: [],
    categorias: [],
    departamentos: [],
    responsaveis: [],
    lojas: [],
    incluirSubchamados: true,
  };
}

export function contarFiltrosAtivos(f: FiltrosRelatorio): number {
  return (
    (f.status.length ? 1 : 0) +
    (f.prioridades.length ? 1 : 0) +
    (f.tipos.length ? 1 : 0) +
    (f.categorias.length ? 1 : 0) +
    (f.departamentos.length ? 1 : 0) +
    (f.responsaveis.length ? 1 : 0) +
    (f.lojas.length ? 1 : 0) +
    (f.incluirSubchamados ? 0 : 1)
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const ehEncerrado = (s: StatusChamado) => STATUS_ENCERRADOS.includes(s);

function horasEntre(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const h = (new Date(b).getTime() - new Date(a).getTime()) / 36e5;
  return h >= 0 && Number.isFinite(h) ? h : null;
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

export function formatarDuracaoHoras(h: number | null): string {
  if (h === null || !Number.isFinite(h)) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1).replace(".", ",")} h`;
  return `${(h / 24).toFixed(1).replace(".", ",")} d`;
}

export function formatarPercentual(v: number | null, casas = 1): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(casas).replace(".", ",")}%`;
}

/** Data usada para filtrar o chamado conforme o campo escolhido. */
function dataDoCampo(c: Chamado, campo: CampoDataRelatorio): string | null {
  return c[campo] ?? null;
}

/* ------------------------------------------------------------------ */
/* Filtro                                                             */
/* ------------------------------------------------------------------ */

export function aplicarFiltros(chamados: Chamado[], f: FiltrosRelatorio): Chamado[] {
  const ini = f.inicio.getTime();
  const fim = f.fim.getTime();
  const deps = new Set(f.departamentos);
  return chamados.filter((c) => {
    const d = dataDoCampo(c, f.campoData);
    if (!d) return false;
    const t = new Date(d).getTime();
    if (t < ini || t > fim) return false;
    if (!f.incluirSubchamados && c.chamado_pai_id) return false;
    if (f.status.length && !f.status.includes(c.status)) return false;
    if (f.prioridades.length && !f.prioridades.includes(c.prioridade)) return false;
    if (f.tipos.length && !f.tipos.includes(c.tipo)) return false;
    if (f.categorias.length && !f.categorias.includes(c.categoria ?? SEM_VALOR)) return false;
    if (f.lojas.length && !f.lojas.includes(c.loja ?? SEM_VALOR)) return false;
    if (f.responsaveis.length && !f.responsaveis.includes(c.responsavel_id ?? SEM_VALOR))
      return false;
    if (deps.size && !(c.departamento_id && deps.has(c.departamento_id))) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* KPIs                                                               */
/* ------------------------------------------------------------------ */

export function calcularKpis(chamados: Chamado[], f: FiltrosRelatorio): KpisRelatorio {
  const agora = Date.now();
  let abertos = 0;
  let encerrados = 0;
  let vencidos = 0;
  let comPrazoEncerrado = 0;
  let noPrazo = 0;
  const resolucao: number[] = [];
  const primeira: number[] = [];

  for (const c of chamados) {
    if (ehEncerrado(c.status)) {
      encerrados++;
      const fimCiclo = c.resolvido_em ?? c.fechado_em;
      const h = horasEntre(c.criado_em, fimCiclo);
      if (h !== null && c.status !== "Cancelado") resolucao.push(h);
      if (c.prazo && fimCiclo && c.status !== "Cancelado") {
        comPrazoEncerrado++;
        if (new Date(fimCiclo).getTime() <= new Date(c.prazo).getTime()) noPrazo++;
      }
    } else {
      abertos++;
      if (c.prazo && new Date(c.prazo).getTime() < agora) vencidos++;
    }
    const h1 = horasEntre(c.criado_em, c.primeiro_resposta_em);
    if (h1 !== null) primeira.push(h1);
  }

  const dias = Math.max(1, differenceInCalendarDays(f.fim, f.inicio) + 1);
  return {
    total: chamados.length,
    abertos,
    encerrados,
    vencidos,
    taxaResolucao: chamados.length ? (encerrados / chamados.length) * 100 : 0,
    tempoMedioResolucaoH: media(resolucao),
    tempoMedio1aRespostaH: media(primeira),
    cumprimentoPrazo: comPrazoEncerrado ? (noPrazo / comPrazoEncerrado) * 100 : null,
    mediaPorDia: chamados.length / dias,
  };
}

/* ------------------------------------------------------------------ */
/* Agrupamento por dimensão                                           */
/* ------------------------------------------------------------------ */

function chaveERotulo(
  c: Chamado,
  dim: DimensaoRelatorio,
  dic: Dicionarios,
): { chave: string; rotulo: string } {
  switch (dim) {
    case "status":
      return { chave: c.status, rotulo: rotuloStatusChamado[c.status] ?? c.status };
    case "prioridade":
      return { chave: c.prioridade, rotulo: rotuloPrioridade[c.prioridade] ?? c.prioridade };
    case "tipo":
      return { chave: c.tipo, rotulo: rotuloTipoChamado[c.tipo] ?? c.tipo };
    case "categoria":
      return { chave: c.categoria ?? SEM_VALOR, rotulo: c.categoria ?? "Sem categoria" };
    case "loja":
      return { chave: c.loja ?? SEM_VALOR, rotulo: c.loja ?? "Sem loja" };
    case "departamento": {
      const id = c.departamento_id;
      return {
        chave: id ?? SEM_VALOR,
        rotulo: id ? (dic.departamentos.get(id) ?? "Departamento removido") : "Sem departamento",
      };
    }
    case "responsavel": {
      const id = c.responsavel_id;
      return {
        chave: id ?? SEM_VALOR,
        rotulo: id ? (dic.pessoas.get(id) ?? "Usuário removido") : "Não atribuído",
      };
    }
    case "solicitante": {
      const id = c.solicitante_id;
      return { chave: id, rotulo: dic.pessoas.get(id) ?? "Usuário removido" };
    }
  }
}

export function agruparPor(
  chamados: Chamado[],
  dim: DimensaoRelatorio,
  dic: Dicionarios,
): ItemAgrupado[] {
  const agora = Date.now();
  const mapa = new Map<
    string,
    {
      rotulo: string;
      total: number;
      abertos: number;
      encerrados: number;
      vencidos: number;
      resolucao: number[];
      primeira: number[];
    }
  >();

  for (const c of chamados) {
    const { chave, rotulo } = chaveERotulo(c, dim, dic);
    let g = mapa.get(chave);
    if (!g) {
      g = { rotulo, total: 0, abertos: 0, encerrados: 0, vencidos: 0, resolucao: [], primeira: [] };
      mapa.set(chave, g);
    }
    g.total++;
    if (ehEncerrado(c.status)) {
      g.encerrados++;
      const h = horasEntre(c.criado_em, c.resolvido_em ?? c.fechado_em);
      if (h !== null && c.status !== "Cancelado") g.resolucao.push(h);
    } else {
      g.abertos++;
      if (c.prazo && new Date(c.prazo).getTime() < agora) g.vencidos++;
    }
    const h1 = horasEntre(c.criado_em, c.primeiro_resposta_em);
    if (h1 !== null) g.primeira.push(h1);
  }

  const total = chamados.length || 1;
  let itens: ItemAgrupado[] = [...mapa.entries()].map(([chave, g]) => ({
    chave,
    rotulo: g.rotulo,
    total: g.total,
    abertos: g.abertos,
    encerrados: g.encerrados,
    vencidos: g.vencidos,
    taxaResolucao: g.total ? (g.encerrados / g.total) * 100 : 0,
    tempoMedioResolucaoH: media(g.resolucao),
    tempoMedio1aRespostaH: media(g.primeira),
    participacao: (g.total / total) * 100,
  }));

  // Ordem natural para dimensões com ordem de negócio; demais por volume.
  const ordem =
    dim === "status"
      ? (STATUS_CHAMADO as string[])
      : dim === "prioridade"
        ? (PRIORIDADES_CHAMADO as string[])
        : dim === "tipo"
          ? (TIPOS_CHAMADO as string[])
          : null;
  if (ordem) {
    itens = itens.sort((a, b) => ordem.indexOf(a.chave) - ordem.indexOf(b.chave));
  } else {
    itens = itens.sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  }
  return itens;
}

/* ------------------------------------------------------------------ */
/* Série temporal                                                     */
/* ------------------------------------------------------------------ */

export function granularidadeSugerida(inicio: Date, fim: Date): Granularidade {
  const dias = differenceInCalendarDays(fim, inicio) + 1;
  if (dias <= 62) return "dia";
  if (dias <= 270) return "semana";
  return "mes";
}

function inicioDoBucket(d: Date, g: Granularidade): Date {
  if (g === "dia") return startOfDay(d);
  if (g === "semana") return startOfWeek(d, { weekStartsOn: 1 });
  return startOfMonth(d);
}

function proximoBucket(d: Date, g: Granularidade): Date {
  if (g === "dia") return addDays(d, 1);
  if (g === "semana") return addDays(d, 7);
  return startOfMonth(addDays(endOfMonth(d), 1));
}

function rotuloBucket(d: Date, g: Granularidade): string {
  if (g === "dia") return format(d, "dd/MM", { locale: ptBR });
  if (g === "semana") {
    return `${format(d, "dd/MM", { locale: ptBR })}–${format(endOfWeek(d, { weekStartsOn: 1 }), "dd/MM", { locale: ptBR })}`;
  }
  return format(d, "MMM/yy", { locale: ptBR });
}

/**
 * Série de "criados" (por criado_em) e "resolvidos" (por resolvido_em/fechado_em)
 * dentro do intervalo. Aqui usamos os chamados já filtrados pelos demais critérios
 * (exceto período), para a comparação abertos × resolvidos ser coerente.
 */
export function serieTemporal(
  chamadosSemPeriodo: Chamado[],
  f: FiltrosRelatorio,
  g: Granularidade,
): PontoSerie[] {
  const pontos = new Map<number, PontoSerie>();
  let cursor = inicioDoBucket(f.inicio, g);
  const limite = f.fim.getTime();
  let guarda = 0;
  while (cursor.getTime() <= limite && guarda++ < 2000) {
    pontos.set(cursor.getTime(), {
      chave: cursor.toISOString(),
      rotulo: rotuloBucket(cursor, g),
      criados: 0,
      resolvidos: 0,
    });
    cursor = proximoBucket(cursor, g);
  }

  const ini = f.inicio.getTime();
  for (const c of chamadosSemPeriodo) {
    const criado = new Date(c.criado_em);
    if (criado.getTime() >= ini && criado.getTime() <= limite) {
      const p = pontos.get(inicioDoBucket(criado, g).getTime());
      if (p) p.criados++;
    }
    const fimCiclo = c.resolvido_em ?? (c.status === "Fechado" ? c.fechado_em : null);
    if (fimCiclo) {
      const r = new Date(fimCiclo);
      if (r.getTime() >= ini && r.getTime() <= limite) {
        const p = pontos.get(inicioDoBucket(r, g).getTime());
        if (p) p.resolvidos++;
      }
    }
  }
  return [...pontos.values()];
}

/** Filtros aplicados a tudo exceto ao período (para a série temporal). */
export function aplicarFiltrosSemPeriodo(chamados: Chamado[], f: FiltrosRelatorio): Chamado[] {
  const amplo: FiltrosRelatorio = {
    ...f,
    inicio: new Date(0),
    fim: new Date(8.64e15),
    campoData: "criado_em",
  };
  return aplicarFiltros(chamados, amplo);
}

/* ------------------------------------------------------------------ */
/* Mapa de calor: dia da semana × hora de abertura                    */
/* ------------------------------------------------------------------ */

export function mapaCalor(chamados: Chamado[]): { matriz: number[][]; max: number } {
  const matriz = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  let max = 0;
  for (const c of chamados) {
    const d = new Date(c.criado_em);
    const v = ++matriz[d.getDay()][d.getHours()];
    if (v > max) max = v;
  }
  return { matriz, max };
}

/* ------------------------------------------------------------------ */
/* Dados tabulares para exportação                                    */
/* ------------------------------------------------------------------ */

export const CABECALHO_DETALHE = [
  "Nº",
  "Código",
  "Título",
  "Status",
  "Prioridade",
  "Tipo",
  "Categoria",
  "Departamento",
  "Loja",
  "Solicitante",
  "Responsável",
  "Criado em",
  "1ª resposta em",
  "Resolvido em",
  "Fechado em",
  "Prazo",
  "Tempo de resolução (h)",
] as const;

const fmtData = (iso: string | null) => (iso ? format(new Date(iso), "dd/MM/yyyy HH:mm") : "");

export function linhasDetalhe(chamados: Chamado[], dic: Dicionarios): (string | number)[][] {
  return chamados.map((c) => {
    const h = horasEntre(c.criado_em, c.resolvido_em ?? c.fechado_em);
    return [
      c.numero,
      c.codigo ?? "",
      c.titulo,
      rotuloStatusChamado[c.status] ?? c.status,
      rotuloPrioridade[c.prioridade] ?? c.prioridade,
      rotuloTipoChamado[c.tipo] ?? c.tipo,
      c.categoria ?? "",
      c.departamento_id ? (dic.departamentos.get(c.departamento_id) ?? "") : "",
      c.loja ?? "",
      dic.pessoas.get(c.solicitante_id) ?? "",
      c.responsavel_id ? (dic.pessoas.get(c.responsavel_id) ?? "") : "",
      fmtData(c.criado_em),
      fmtData(c.primeiro_resposta_em),
      fmtData(c.resolvido_em),
      fmtData(c.fechado_em),
      fmtData(c.prazo),
      h === null ? "" : Number(h.toFixed(2)),
    ];
  });
}

export const CABECALHO_AGRUPADO = [
  "Grupo",
  "Total",
  "% do total",
  "Em aberto",
  "Encerrados",
  "Vencidos",
  "Taxa de resolução (%)",
  "Tempo médio de resolução (h)",
  "Tempo médio 1ª resposta (h)",
] as const;

export function linhasAgrupado(itens: ItemAgrupado[]): (string | number)[][] {
  const r1 = (n: number | null) => (n === null ? "" : Number(n.toFixed(2)));
  return itens.map((i) => [
    i.rotulo,
    i.total,
    Number(i.participacao.toFixed(2)),
    i.abertos,
    i.encerrados,
    i.vencidos,
    Number(i.taxaResolucao.toFixed(2)),
    r1(i.tempoMedioResolucaoH),
    r1(i.tempoMedio1aRespostaH),
  ]);
}
