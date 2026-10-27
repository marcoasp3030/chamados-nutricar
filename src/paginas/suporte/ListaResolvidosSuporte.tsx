import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { endOfDay, startOfDay } from "date-fns";
import { ArrowLeft, CheckCircle2, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamados } from "@/hooks/useChamados";
import { LinhaChamadoSuporte } from "./LinhaChamadoSuporte";

export function ListaResolvidosSuporte() {
  const { workspaceAtual } = useWorkspaceStore();
  const [busca, setBusca] = useState("");
  const [loja, setLoja] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  const { data: chamados, isLoading } = useChamados(workspaceAtual?.id, {
    responsavel_id: "MEUS",
    somenteRaiz: true,
    statusIn: ["Resolvido", "Fechado"],
    busca: busca.trim() || undefined,
  });

  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const c of chamados ?? []) {
      if (c.categoria?.trim()) set.add(c.categoria.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [chamados]);

  const lista = useMemo(() => {
    let itens = chamados ?? [];
    if (loja.trim()) {
      const termo = loja.trim().toLowerCase();
      itens = itens.filter((c) => c.loja?.toLowerCase().includes(termo));
    }
    if (categoria !== "Todas") {
      itens = itens.filter((c) => c.categoria === categoria);
    }
    if (dataDe) {
      const inicio = startOfDay(new Date(`${dataDe}T00:00:00`));
      itens = itens.filter((c) => {
        const ref = c.resolvido_em ?? c.fechado_em;
        return ref && new Date(ref) >= inicio;
      });
    }
    if (dataAte) {
      const fim = endOfDay(new Date(`${dataAte}T23:59:59`));
      itens = itens.filter((c) => {
        const ref = c.resolvido_em ?? c.fechado_em;
        return ref && new Date(ref) <= fim;
      });
    }
    return itens.sort((a, b) => {
      const da = a.resolvido_em ?? a.fechado_em ?? a.atualizado_em;
      const db = b.resolvido_em ?? b.fechado_em ?? b.atualizado_em;
      return new Date(db).getTime() - new Date(da).getTime();
    });
  }, [chamados, loja, categoria, dataDe, dataAte]);

  const temFiltros = !!(busca || loja || categoria !== "Todas" || dataDe || dataAte);

  if (!workspaceAtual) return null;

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to="/w/$slug/suporte" params={{ slug: workspaceAtual.slug }}>
            <ArrowLeft className="h-4 w-4" /> Minha área
          </Link>
        </Button>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Chamados resolvidos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Histórico dos chamados que você resolveu. Pesquise por título, loja ou categoria.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="busca-resolvidos">Pesquisar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="busca-resolvidos"
                className="pl-9"
                placeholder="Título ou número do chamado..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filtro-loja">Loja</Label>
            <Input
              id="filtro-loja"
              placeholder="Nome da loja..."
              value={loja}
              onChange={(e) => setLoja(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data-de">Resolvido de</Label>
            <Input
              id="data-de"
              type="date"
              value={dataDe}
              onChange={(e) => setDataDe(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data-ate">Resolvido até</Label>
            <Input
              id="data-ate"
              type="date"
              value={dataAte}
              onChange={(e) => setDataAte(e.target.value)}
            />
          </div>
        </div>
        {temFiltros && (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setBusca("");
                setLoja("");
                setCategoria("Todas");
                setDataDe("");
                setDataAte("");
              }}
            >
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">
            {temFiltros ? "Nenhum resultado" : "Nenhum chamado resolvido ainda"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {temFiltros
              ? "Tente outros termos de pesquisa ou limpe os filtros."
              : "Quando você resolver chamados, eles aparecerão aqui."}
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {lista.length}{" "}
            {lista.length === 1 ? "chamado encontrado" : "chamados encontrados"}
          </p>
          <div className="space-y-2">
            {lista.map((c) => (
              <LinhaChamadoSuporte
                key={c.id}
                chamado={c}
                slug={workspaceAtual.slug}
                compacto
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
