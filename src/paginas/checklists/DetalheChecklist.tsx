import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, FileDown, History, Loader2, MessageSquare, Save } from "lucide-react";
import { PainelComentarios } from "@/componentes/checklists/PainelComentarios";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import {
  useChecklist,
  useHistoricoChecklist,
  useItensTemplate,
  useRespostasChecklist,
  type ItemTemplate,
} from "@/hooks/useChecklists";

interface Props {
  checklistId: string;
}

type Valor = boolean | string | number | null;

export function DetalheChecklist({ checklistId }: Props) {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { data: checklist, isLoading } = useChecklist(checklistId);
  const { data: itens } = useItensTemplate(checklist?.template_id);
  const { data: respostas } = useRespostasChecklist(checklistId);
  const { data: historico } = useHistoricoChecklist(checklistId);
  const [valores, setValores] = useState<Record<string, Valor>>({});
  const [iniciais, setIniciais] = useState<Record<string, Valor>>({});
  const [historicoAberto, setHistoricoAberto] = useState(false);

  useEffect(() => {
    if (!respostas) return;
    const map: Record<string, Valor> = {};
    for (const r of respostas) {
      const v = r.valor as { v?: Valor } | null;
      map[r.item_id] = v?.v ?? null;
    }
    setValores(map);
    setIniciais(map);
  }, [respostas]);

  const grupos = useMemo(() => {
    const m = new Map<string, Map<string, ItemTemplate[]>>();
    for (const it of itens ?? []) {
      if (!m.has(it.secao)) m.set(it.secao, new Map());
      const sub = it.subsecao ?? "_";
      const subMap = m.get(it.secao)!;
      if (!subMap.has(sub)) subMap.set(sub, []);
      subMap.get(sub)!.push(it);
    }
    return m;
  }, [itens]);

  const dirty = useMemo(() => {
    for (const k of Object.keys(valores)) {
      if (valores[k] !== iniciais[k]) return true;
    }
    return false;
  }, [valores, iniciais]);

  const salvar = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !checklist) throw new Error("Sessão expirada");
      const alterados: { item_id: string; rotulo: string; antes: Valor; depois: Valor }[] = [];
      const upserts: {
        checklist_id: string;
        item_id: string;
        workspace_id: string;
        valor: { v: Valor };
        atualizado_por: string;
      }[] = [];
      for (const it of itens ?? []) {
        const novo = valores[it.id] ?? null;
        const antigo = iniciais[it.id] ?? null;
        if (novo === antigo) continue;
        alterados.push({ item_id: it.id, rotulo: it.rotulo, antes: antigo, depois: novo });
        upserts.push({
          checklist_id: checklist.id,
          item_id: it.id,
          workspace_id: checklist.workspace_id,
          valor: { v: novo },
          atualizado_por: u.user.id,
        });
      }
      if (upserts.length === 0) return { count: 0 };
      const { error } = await supabase
        .from("checklist_respostas")
        .upsert(upserts, { onConflict: "checklist_id,item_id" });
      if (error) throw error;

      await supabase.from("checklist_historico").insert(
        alterados.map((a) => ({
          checklist_id: checklist.id,
          workspace_id: checklist.workspace_id,
          usuario_id: u.user.id,
          item_id: a.item_id,
          rotulo: a.rotulo,
          acao: "preencheu",
          valor_anterior: { v: a.antes },
          valor_novo: { v: a.depois },
        })),
      );
      await supabase
        .from("checklists")
        .update({ atualizado_em: new Date().toISOString() })
        .eq("id", checklist.id);
      return { count: upserts.length };
    },
    onSuccess: (r) => {
      if (r.count === 0) toast.info("Nada para salvar.");
      else toast.success(`${r.count} resposta(s) salva(s).`);
      queryClient.invalidateQueries({ queryKey: ["checklist-respostas", checklistId] });
      queryClient.invalidateQueries({ queryKey: ["checklist-historico", checklistId] });
    },
    onError: (e: Error) => toast.error("Falha ao salvar.", { description: e.message }),
  });

  const alterarStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!checklist) return;
      const { error } = await supabase
        .from("checklists")
        .update({ status })
        .eq("id", checklist.id);
      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("checklist_historico").insert({
        checklist_id: checklist.id,
        workspace_id: checklist.workspace_id,
        usuario_id: u.user?.id ?? null,
        acao: `alterou status para ${status}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", checklistId] });
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-historico", checklistId] });
    },
  });

  if (!workspaceAtual) return null;
  if (isLoading || !checklist) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = (itens ?? []).length;
  const preenchidos = (itens ?? []).filter((it) => {
    const v = valores[it.id];
    return v !== null && v !== "" && v !== undefined && v !== false;
  }).length;
  const pct = total > 0 ? Math.round((preenchidos / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/w/$slug/checklists" params={{ slug: workspaceAtual.slug }}>
              <ArrowLeft className="h-4 w-4" /> Checklists
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{checklist.nome}</h1>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="secondary">{checklist.status}</Badge>
            <span className="text-xs text-muted-foreground">
              {preenchidos} / {total} preenchidos · {pct}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={checklist.status}
            onValueChange={(v) => alterarStatus.mutate(v)}
          >
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Em andamento">Em andamento</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setHistoricoAberto(true)}>
            <History className="h-4 w-4" /> Histórico
          </Button>
          <Button variant="outline" onClick={() => exportarPDF({ checklist, itens: itens ?? [], valores, pct, preenchidos, total })}>
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
          <Button
            onClick={() => salvar.mutate()}
            disabled={!dirty || salvar.isPending}
          >
            {salvar.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-6">
        {Array.from(grupos.entries()).map(([secao, subs]) => (
          <section key={secao} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">{secao}</h2>
            <div className="space-y-5">
              {Array.from(subs.entries()).map(([sub, lista]) => (
                <div key={sub}>
                  {sub !== "_" && (
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">{sub}</h3>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {lista.map((it) => (
                      <CampoItem
                        key={it.id}
                        item={it}
                        valor={valores[it.id] ?? null}
                        onChange={(v) =>
                          setValores((prev) => ({ ...prev, [it.id]: v }))
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {workspaceAtual && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Comentários</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Compartilhe atualizações, riscos e decisões com a equipe sobre esta inauguração.
          </p>
          <PainelComentarios checklistId={checklistId} workspaceId={workspaceAtual.id} />
        </section>
      )}
      <Sheet open={historicoAberto} onOpenChange={setHistoricoAberto}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Histórico</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {(historico ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem registros.</p>
            ) : (
              (historico ?? []).map((h) => (
                <div key={h.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">
                    {h.usuario_nome} <span className="font-normal text-muted-foreground">{h.acao}</span>
                  </p>
                  {h.rotulo && (
                    <p className="text-xs text-muted-foreground">
                      {h.rotulo}: {formatarValor(h.valor_novo)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(h.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object" && v !== null && "v" in v) {
    const inner = (v as { v: unknown }).v;
    if (inner === null || inner === undefined || inner === "") return "—";
    if (typeof inner === "boolean") return inner ? "Sim" : "Não";
    return String(inner);
  }
  return String(v);
}

function formatarValorCampo(item: ItemTemplate, v: Valor): string {
  if (v === null || v === undefined || v === "") return "—";
  if (item.tipo === "checkbox") return v ? "Sim" : "Não";
  if (item.tipo === "sim_nao") return v === "sim" ? "Sim" : v === "nao" ? "Não" : "—";
  if (item.tipo === "data" && typeof v === "string") {
    try {
      return format(new Date(v + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function exportarPDF({
  checklist,
  itens,
  valores,
  pct,
  preenchidos,
  total,
}: {
  checklist: { nome: string; status: string; criado_em: string };
  itens: ItemTemplate[];
  valores: Record<string, Valor>;
  pct: number;
  preenchidos: number;
  total: number;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(checklist.nome, margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `Status: ${checklist.status}  ·  Preenchimento: ${preenchidos}/${total} (${pct}%)  ·  Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    margin,
    y,
  );
  y += 18;
  doc.setTextColor(0);
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  // Group by section/subsection
  const grupos = new Map<string, Map<string, ItemTemplate[]>>();
  for (const it of itens) {
    if (!grupos.has(it.secao)) grupos.set(it.secao, new Map());
    const sub = it.subsecao ?? "_";
    const subMap = grupos.get(it.secao)!;
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub)!.push(it);
  }

  const labelW = 220;
  const valueW = pageW - margin * 2 - labelW - 10;

  for (const [secao, subs] of grupos.entries()) {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 2, pageW - margin * 2, 18, "F");
    doc.text(secao, margin + 6, y + 11);
    y += 24;

    for (const [sub, lista] of subs.entries()) {
      if (sub !== "_") {
        ensureSpace(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(90);
        doc.text(sub, margin, y);
        doc.setTextColor(0);
        y += 14;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      for (const it of lista) {
        const valorTxt = formatarValorCampo(it, valores[it.id] ?? null);
        const labelLines = doc.splitTextToSize(it.rotulo, labelW);
        const valueLines = doc.splitTextToSize(valorTxt, valueW);
        const rowH = Math.max(labelLines.length, valueLines.length) * 12 + 6;
        ensureSpace(rowH);
        doc.setTextColor(80);
        doc.text(labelLines, margin, y + 10);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(valueLines, margin + labelW + 10, y + 10);
        doc.setFont("helvetica", "normal");
        y += rowH;
        doc.setDrawColor(240);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
      }
      y += 4;
    }
    y += 6;
  }

  const total2 = doc.getNumberOfPages();
  for (let i = 1; i <= total2; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${total2}`, pageW - margin, pageH - 20, { align: "right" });
  }

  const safe = checklist.nome.replace(/[^\w\-]+/g, "_").slice(0, 60);
  doc.save(`${safe || "checklist"}.pdf`);
}

function CampoItem({
  item,
  valor,
  onChange,
}: {
  item: ItemTemplate;
  valor: Valor;
  onChange: (v: Valor) => void;
}) {
  if (item.tipo === "checkbox") {
    return (
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2">
        <Checkbox
          checked={!!valor}
          onCheckedChange={(c) => onChange(!!c)}
        />
        <span className="text-sm">{item.rotulo}</span>
      </label>
    );
  }
  if (item.tipo === "sim_nao") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{item.rotulo}</Label>
        <Select value={(valor as string) ?? ""} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sim">Sim</SelectItem>
            <SelectItem value="nao">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (item.tipo === "select") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{item.rotulo}</Label>
        <Select value={(valor as string) ?? ""} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {(item.opcoes ?? []).map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (item.tipo === "textarea") {
    return (
      <div className="space-y-1 md:col-span-2">
        <Label className="text-xs">{item.rotulo}</Label>
        <Textarea
          value={(valor as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
        />
      </div>
    );
  }
  if (item.tipo === "data") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{item.rotulo}</Label>
        <Input
          type="date"
          value={(valor as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      </div>
    );
  }
  if (item.tipo === "numero") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{item.rotulo}</Label>
        <Input
          type="number"
          value={valor === null ? "" : String(valor)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs">{item.rotulo}</Label>
      <Input
        value={(valor as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
