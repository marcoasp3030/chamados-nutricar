import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatarDuracaoHoras,
  formatarPercentual,
  type ItemAgrupado,
  type PontoSerie,
} from "@/utilitarios/relatorios";

export const PALETA = [
  "#65a30d",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#14b8a6",
  "#ef4444",
  "#ec4899",
  "#0ea5e9",
  "#f97316",
  "#64748b",
];

export type MetricaGrafico = "total" | "tempo" | "taxa";

export const ROTULO_METRICA: Record<MetricaGrafico, string> = {
  total: "Volume",
  tempo: "Tempo médio de resolução",
  taxa: "Taxa de resolução",
};

/* ------------------------------ Evolução -------------------------------- */

const cfgSerie = {
  criados: { label: "Criados", color: PALETA[0] },
  resolvidos: { label: "Resolvidos", color: PALETA[1] },
} satisfies ChartConfig;

export function GraficoEvolucao({ dados }: { dados: PontoSerie[] }) {
  const intervalo = Math.max(0, Math.ceil(dados.length / 12) - 1);
  return (
    <ChartContainer config={cfgSerie} className="h-[300px] w-full">
      <AreaChart data={dados} margin={{ left: -12, right: 8, top: 8 }}>
        <defs>
          {(["criados", "resolvidos"] as const).map((k) => (
            <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${k})`} stopOpacity={0.35} />
              <stop offset="100%" stopColor={`var(--color-${k})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="rotulo"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={intervalo}
          fontSize={11}
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="criados"
          stroke="var(--color-criados)"
          strokeWidth={2}
          fill="url(#grad-criados)"
        />
        <Area
          type="monotone"
          dataKey="resolvidos"
          stroke="var(--color-resolvidos)"
          strokeWidth={2}
          fill="url(#grad-resolvidos)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

/* ------------------------------ Rosca ----------------------------------- */

export function GraficoRosca({
  itens,
  total,
  onSelecionar,
}: {
  itens: ItemAgrupado[];
  total: number;
  onSelecionar?: (chave: string) => void;
}) {
  const config: ChartConfig = Object.fromEntries(
    itens.map((i, idx) => [i.chave, { label: i.rotulo, color: PALETA[idx % PALETA.length] }]),
  );
  const dados = itens.map((i, idx) => ({
    chave: i.chave,
    rotulo: i.rotulo,
    total: i.total,
    fill: PALETA[idx % PALETA.length],
  }));
  return (
    <div className="relative">
      <ChartContainer config={config} className="mx-auto h-[250px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="rotulo" hideLabel />} />
          <Pie
            data={dados}
            dataKey="total"
            nameKey="rotulo"
            innerRadius={62}
            outerRadius={95}
            paddingAngle={2}
            strokeWidth={0}
            onClick={(d) => onSelecionar?.((d as { chave: string }).chave)}
            className={onSelecionar ? "cursor-pointer" : undefined}
          >
            {dados.map((d) => (
              <Cell key={d.chave} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none tracking-tight">{total}</span>
        <span className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          chamados
        </span>
      </div>
    </div>
  );
}

export function LegendaRosca({ itens }: { itens: ItemAgrupado[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
      {itens.map((i, idx) => (
        <li key={i.chave} className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: PALETA[idx % PALETA.length] }}
            />
            <span className="truncate">{i.rotulo}</span>
          </span>
          <span className="tabular-nums text-muted-foreground">
            {i.total} · {formatarPercentual(i.participacao, 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------- Barras horizontais ------------------------- */

export function GraficoBarras({
  itens,
  metrica,
  limite = 12,
  onSelecionar,
}: {
  itens: ItemAgrupado[];
  metrica: MetricaGrafico;
  limite?: number;
  onSelecionar?: (chave: string) => void;
}) {
  const base =
    metrica === "total"
      ? itens
      : [...itens]
          .filter((i) => (metrica === "tempo" ? i.tempoMedioResolucaoH !== null : i.total > 0))
          .sort((a, b) =>
            metrica === "tempo"
              ? (b.tempoMedioResolucaoH ?? 0) - (a.tempoMedioResolucaoH ?? 0)
              : b.taxaResolucao - a.taxaResolucao,
          );
  const topo = base.slice(0, limite);
  const altura = Math.max(180, topo.length * 34 + 40);

  if (metrica === "total") {
    const config = {
      abertos: { label: "Em aberto", color: PALETA[2] },
      encerrados: { label: "Encerrados", color: PALETA[0] },
    } satisfies ChartConfig;
    return (
      <ChartContainer config={config} className="w-full" style={{ height: altura }}>
        <BarChart data={topo} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <YAxis
            dataKey="rotulo"
            type="category"
            tickLine={false}
            axisLine={false}
            width={130}
            fontSize={11}
            tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="encerrados"
            stackId="a"
            fill="var(--color-encerrados)"
            radius={[0, 0, 0, 0]}
            onClick={(d) => onSelecionar?.((d as unknown as { chave: string }).chave)}
            className={onSelecionar ? "cursor-pointer" : undefined}
          />
          <Bar
            dataKey="abertos"
            stackId="a"
            fill="var(--color-abertos)"
            radius={[0, 4, 4, 0]}
            onClick={(d) => onSelecionar?.((d as unknown as { chave: string }).chave)}
            className={onSelecionar ? "cursor-pointer" : undefined}
          />
        </BarChart>
      </ChartContainer>
    );
  }

  const dados = topo.map((i) => ({
    chave: i.chave,
    rotulo: i.rotulo,
    valor:
      metrica === "tempo"
        ? Number((i.tempoMedioResolucaoH ?? 0).toFixed(2))
        : Number(i.taxaResolucao.toFixed(1)),
  }));
  const config = {
    valor: { label: ROTULO_METRICA[metrica], color: metrica === "tempo" ? PALETA[3] : PALETA[1] },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="w-full" style={{ height: altura }}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <YAxis
          dataKey="rotulo"
          type="category"
          tickLine={false}
          axisLine={false}
          width={130}
          fontSize={11}
          tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(v: number) => (metrica === "tempo" ? formatarDuracaoHoras(v) : `${v}%`)}
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
          content={
            <ChartTooltipContent
              formatter={(v) => (
                <span className="font-mono font-medium tabular-nums">
                  {metrica === "tempo"
                    ? formatarDuracaoHoras(Number(v))
                    : `${Number(v).toFixed(1).replace(".", ",")}%`}
                </span>
              )}
            />
          }
        />
        <Bar
          dataKey="valor"
          fill="var(--color-valor)"
          radius={[0, 4, 4, 0]}
          onClick={(d) => onSelecionar?.((d as unknown as { chave: string }).chave)}
          className={onSelecionar ? "cursor-pointer" : undefined}
        />
      </BarChart>
    </ChartContainer>
  );
}

/* ------------------------------ Mapa de calor --------------------------- */

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function MapaCalor({ matriz, max }: { matriz: number[][]; max: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div
          className="ml-10 grid grid-cols-24 gap-[3px] text-[10px] text-muted-foreground"
          style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center">
              {h % 3 === 0 ? `${h}h` : ""}
            </span>
          ))}
        </div>
        {matriz.map((linha, dia) => (
          <div key={dia} className="mt-[3px] flex items-center gap-2">
            <span className="w-8 text-right text-[11px] text-muted-foreground">{DIAS[dia]}</span>
            <div
              className="grid flex-1 gap-[3px]"
              style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
            >
              {linha.map((v, h) => (
                <div
                  key={h}
                  title={`${DIAS[dia]} às ${h}h: ${v} chamado(s)`}
                  className="aspect-square rounded-[4px] bg-primary"
                  style={{ opacity: v === 0 ? 0.06 : 0.18 + 0.82 * (v / (max || 1)) }}
                />
              ))}
            </div>
          </div>
        ))}
        <p className="ml-10 mt-3 text-[11px] text-muted-foreground">
          Horário de abertura dos chamados · quanto mais escuro, maior o volume.
        </p>
      </div>
    </div>
  );
}
