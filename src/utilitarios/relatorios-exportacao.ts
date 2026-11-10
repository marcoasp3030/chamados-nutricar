import { format } from "date-fns";
import {
  CABECALHO_AGRUPADO,
  CABECALHO_DETALHE,
  ROTULO_CAMPO_DATA,
  ROTULO_DIMENSAO,
  formatarDuracaoHoras,
  formatarPercentual,
  linhasAgrupado,
  linhasDetalhe,
  type Dicionarios,
  type DimensaoRelatorio,
  type FiltrosRelatorio,
  type ItemAgrupado,
  type KpisRelatorio,
  type PontoSerie,
} from "@/utilitarios/relatorios";
import type { Chamado } from "@/tipos/chamado";

export interface DadosExportacao {
  workspaceNome: string;
  filtros: FiltrosRelatorio;
  chamados: Chamado[];
  kpis: KpisRelatorio;
  serie: PontoSerie[];
  dimensao: DimensaoRelatorio;
  agrupado: ItemAgrupado[];
  /** Agrupamentos extras para o PDF/Excel (resumo executivo). */
  resumos: Array<{ dimensao: DimensaoRelatorio; itens: ItemAgrupado[] }>;
  dic: Dicionarios;
}

const carimbo = () => format(new Date(), "yyyyMMdd-HHmm");
const dataBR = (d: Date) => format(d, "dd/MM/yyyy");

export function descreverFiltros(f: FiltrosRelatorio, dic: Dicionarios): string[] {
  const linhas = [
    `Período: ${dataBR(f.inicio)} a ${dataBR(f.fim)} (${ROTULO_CAMPO_DATA[f.campoData]})`,
  ];
  if (f.status.length) linhas.push(`Status: ${f.status.join(", ")}`);
  if (f.prioridades.length) linhas.push(`Prioridade: ${f.prioridades.join(", ")}`);
  if (f.tipos.length) linhas.push(`Tipo: ${f.tipos.join(", ")}`);
  if (f.categorias.length)
    linhas.push(
      `Categoria: ${f.categorias.map((c) => (c === "__sem__" ? "Sem categoria" : c)).join(", ")}`,
    );
  if (f.departamentos.length)
    linhas.push(
      `Departamento: ${f.departamentos.map((d) => dic.departamentos.get(d) ?? d).join(", ")}`,
    );
  if (f.responsaveis.length)
    linhas.push(
      `Responsável: ${f.responsaveis.map((r) => (r === "__sem__" ? "Não atribuído" : (dic.pessoas.get(r) ?? r))).join(", ")}`,
    );
  if (f.lojas.length)
    linhas.push(`Loja: ${f.lojas.map((l) => (l === "__sem__" ? "Sem loja" : l)).join(", ")}`);
  if (!f.incluirSubchamados) linhas.push("Subchamados: excluídos");
  return linhas;
}

function linhasKpis(k: KpisRelatorio): [string, string | number][] {
  return [
    ["Total de chamados", k.total],
    ["Em aberto", k.abertos],
    ["Encerrados", k.encerrados],
    ["Vencidos (em aberto com prazo expirado)", k.vencidos],
    ["Taxa de resolução", formatarPercentual(k.taxaResolucao)],
    ["Tempo médio de resolução", formatarDuracaoHoras(k.tempoMedioResolucaoH)],
    ["Tempo médio até 1ª resposta", formatarDuracaoHoras(k.tempoMedio1aRespostaH)],
    ["Cumprimento de prazo", formatarPercentual(k.cumprimentoPrazo)],
    ["Média de chamados por dia", Number(k.mediaPorDia.toFixed(2))],
  ];
}

/* ------------------------------------------------------------------ */
/* Excel                                                              */
/* ------------------------------------------------------------------ */

export async function exportarExcel(d: DadosExportacao) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const resumo: (string | number)[][] = [
    [`Relatório de chamados — ${d.workspaceNome}`],
    [`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
    [],
    ["Filtros aplicados"],
    ...descreverFiltros(d.filtros, d.dic).map((l) => [l]),
    [],
    ["Indicadores"],
    ...linhasKpis(d.kpis),
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 42 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  const wsSerie = XLSX.utils.aoa_to_sheet([
    ["Período", "Criados", "Resolvidos"],
    ...d.serie.map((p) => [p.rotulo, p.criados, p.resolvidos]),
  ]);
  wsSerie["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsSerie, "Evolução");

  const vistas = new Map<DimensaoRelatorio, ItemAgrupado[]>();
  for (const r of d.resumos) vistas.set(r.dimensao, r.itens);
  vistas.set(d.dimensao, d.agrupado);
  for (const [dim, itens] of vistas) {
    const ws = XLSX.utils.aoa_to_sheet([[...CABECALHO_AGRUPADO], ...linhasAgrupado(itens)]);
    ws["!cols"] = [{ wch: 32 }, ...CABECALHO_AGRUPADO.slice(1).map(() => ({ wch: 18 }))];
    XLSX.utils.book_append_sheet(wb, ws, `Por ${ROTULO_DIMENSAO[dim]}`.slice(0, 31));
  }

  const wsDet = XLSX.utils.aoa_to_sheet([
    [...CABECALHO_DETALHE],
    ...linhasDetalhe(d.chamados, d.dic),
  ]);
  wsDet["!cols"] = [6, 14, 48, 18, 12, 14, 22, 22, 18, 24, 24, 17, 17, 17, 17, 17, 14].map(
    (wch) => ({
      wch,
    }),
  );
  wsDet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: d.chamados.length, c: CABECALHO_DETALHE.length - 1 },
    }),
  };
  XLSX.utils.book_append_sheet(wb, wsDet, "Chamados");

  XLSX.writeFile(wb, `relatorio-chamados-${carimbo()}.xlsx`);
}

/* ------------------------------------------------------------------ */
/* CSV (detalhado; UTF-8 com BOM e ';' para abrir direto no Excel BR)  */
/* ------------------------------------------------------------------ */

function escaparCsv(v: string | number): string {
  let s = String(v ?? "");
  // Mitiga injeção de fórmula em planilhas (=, +, -, @, tab, CR).
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportarCsv(d: DadosExportacao) {
  const linhas = [[...CABECALHO_DETALHE], ...linhasDetalhe(d.chamados, d.dic)];
  const csv = "﻿" + linhas.map((l) => l.map(escaparCsv).join(";")).join("\r\n");
  baixarBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `relatorio-chamados-${carimbo()}.csv`,
  );
}

function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* PDF                                                                */
/* ------------------------------------------------------------------ */

const VERDE: [number, number, number] = [101, 163, 13];
const CINZA: [number, number, number] = [100, 116, 139];
const ESCURO: [number, number, number] = [15, 23, 42];

export async function exportarPdf(d: DadosExportacao) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const novaPaginaSe = (altura: number) => {
    if (y + altura > H - M) {
      doc.addPage();
      y = M;
    }
  };

  const titulo = (txt: string) => {
    novaPaginaSe(34);
    doc
      .setFont("helvetica", "bold")
      .setFontSize(12)
      .setTextColor(...ESCURO);
    doc.text(txt, M, y);
    doc
      .setDrawColor(...VERDE)
      .setLineWidth(1.5)
      .line(M, y + 4, M + 28, y + 4);
    y += 22;
  };

  // Cabeçalho
  doc.setFillColor(...VERDE).rect(0, 0, W, 6, "F");
  y = 36;
  doc
    .setFont("helvetica", "bold")
    .setFontSize(18)
    .setTextColor(...ESCURO);
  doc.text("Relatório de chamados", M, y);
  y += 16;
  doc
    .setFont("helvetica", "normal")
    .setFontSize(10)
    .setTextColor(...CINZA);
  doc.text(`${d.workspaceNome} · gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, M, y);
  y += 16;
  for (const l of descreverFiltros(d.filtros, d.dic)) {
    for (const parte of doc.splitTextToSize(l, W - 2 * M) as string[]) {
      doc.text(parte, M, y);
      y += 12;
    }
  }
  y += 10;

  // KPIs em grade 3 x 3
  titulo("Indicadores");
  const kpis = linhasKpis(d.kpis);
  const larg = (W - 2 * M - 20) / 3;
  kpis.forEach(([rot, val], i) => {
    const col = i % 3;
    const lin = Math.floor(i / 3);
    const x = M + col * (larg + 10);
    const yy = y + lin * 50;
    doc
      .setDrawColor(226, 232, 240)
      .setFillColor(248, 250, 252)
      .roundedRect(x, yy, larg, 42, 5, 5, "FD");
    doc
      .setFont("helvetica", "normal")
      .setFontSize(8)
      .setTextColor(...CINZA);
    doc.text(rot, x + 8, yy + 14, { maxWidth: larg - 16 });
    doc
      .setFont("helvetica", "bold")
      .setFontSize(14)
      .setTextColor(...ESCURO);
    doc.text(String(val), x + 8, yy + 34);
  });
  y += Math.ceil(kpis.length / 3) * 50 + 14;

  // Gráfico de barras da evolução
  titulo("Evolução no período");
  const altG = 120;
  novaPaginaSe(altG + 30);
  const maxV = Math.max(1, ...d.serie.map((p) => Math.max(p.criados, p.resolvidos)));
  const areaW = W - 2 * M;
  const passo = areaW / Math.max(1, d.serie.length);
  doc.setDrawColor(226, 232, 240).setLineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const gy = y + altG - (altG * i) / 4;
    doc.line(M, gy, W - M, gy);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(7)
      .setTextColor(...CINZA);
    doc.text(String(Math.round((maxV * i) / 4)), M - 4, gy + 2, { align: "right" });
  }
  const bw = Math.max(1, Math.min(14, passo * 0.38));
  d.serie.forEach((p, i) => {
    const x = M + i * passo + passo / 2;
    const hc = (p.criados / maxV) * altG;
    const hr = (p.resolvidos / maxV) * altG;
    doc.setFillColor(...VERDE).rect(x - bw, y + altG - hc, bw, hc, "F");
    doc.setFillColor(59, 130, 246).rect(x, y + altG - hr, bw, hr, "F");
  });
  const cadaN = Math.ceil(d.serie.length / 14);
  d.serie.forEach((p, i) => {
    if (i % cadaN !== 0) return;
    doc.setFontSize(6.5).setTextColor(...CINZA);
    doc.text(p.rotulo, M + i * passo + passo / 2, y + altG + 10, { align: "center" });
  });
  y += altG + 18;
  doc.setFillColor(...VERDE).rect(M, y, 8, 8, "F");
  doc
    .setFontSize(8)
    .setTextColor(...ESCURO)
    .text("Criados", M + 12, y + 7);
  doc.setFillColor(59, 130, 246).rect(M + 60, y, 8, 8, "F");
  doc.text("Resolvidos", M + 72, y + 7);
  y += 24;

  // Tabelas por dimensão
  const vistas = new Map<DimensaoRelatorio, ItemAgrupado[]>();
  for (const r of d.resumos) vistas.set(r.dimensao, r.itens);
  vistas.set(d.dimensao, d.agrupado);

  const colunas = [
    { rot: "Grupo", w: 0.34, alin: "left" as const },
    { rot: "Total", w: 0.09, alin: "right" as const },
    { rot: "%", w: 0.09, alin: "right" as const },
    { rot: "Abertos", w: 0.1, alin: "right" as const },
    { rot: "Encerr.", w: 0.1, alin: "right" as const },
    { rot: "Venc.", w: 0.08, alin: "right" as const },
    { rot: "Resolução", w: 0.1, alin: "right" as const },
    { rot: "Tempo méd.", w: 0.1, alin: "right" as const },
  ];

  for (const [dim, itens] of vistas) {
    titulo(`Chamados por ${ROTULO_DIMENSAO[dim].toLowerCase()}`);
    const largTab = W - 2 * M;
    const desenharCab = () => {
      doc.setFillColor(241, 245, 249).rect(M, y - 9, largTab, 15, "F");
      doc
        .setFont("helvetica", "bold")
        .setFontSize(8)
        .setTextColor(...ESCURO);
      let x = M;
      for (const c of colunas) {
        const cw = c.w * largTab;
        doc.text(c.rot, c.alin === "right" ? x + cw - 4 : x + 4, y + 1, { align: c.alin });
        x += cw;
      }
      y += 14;
    };
    desenharCab();
    const limite = itens.slice(0, 40);
    for (const i of limite) {
      if (y + 14 > H - M) {
        doc.addPage();
        y = M;
        desenharCab();
      }
      const cel = [
        i.rotulo,
        String(i.total),
        formatarPercentual(i.participacao),
        String(i.abertos),
        String(i.encerrados),
        String(i.vencidos),
        formatarPercentual(i.taxaResolucao, 0),
        formatarDuracaoHoras(i.tempoMedioResolucaoH),
      ];
      doc
        .setFont("helvetica", "normal")
        .setFontSize(8)
        .setTextColor(...ESCURO);
      let x = M;
      colunas.forEach((c, idx) => {
        const cw = c.w * largTab;
        const txt = doc.splitTextToSize(cel[idx], cw - 8)[0] as string;
        doc.text(txt, c.alin === "right" ? x + cw - 4 : x + 4, y, { align: c.alin });
        x += cw;
      });
      doc.setDrawColor(241, 245, 249).line(M, y + 4, M + largTab, y + 4);
      y += 14;
    }
    if (itens.length > limite.length) {
      doc.setFontSize(7.5).setTextColor(...CINZA);
      doc.text(`… e mais ${itens.length - limite.length} grupos (veja o Excel).`, M, y);
      y += 12;
    }
    y += 14;
  }

  // Rodapé com paginação
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(7.5)
      .setTextColor(...CINZA);
    doc.text(`Nutricar · ${d.workspaceNome}`, M, H - 18);
    doc.text(`Página ${p} de ${n}`, W - M, H - 18, { align: "right" });
  }

  doc.save(`relatorio-chamados-${carimbo()}.pdf`);
}
