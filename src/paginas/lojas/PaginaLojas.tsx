import { useMemo, useState } from "react";
import {
  Store,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  LayoutGrid,
  Rows3,
  MapPin,
  Building2,
  Mail,
  Phone,
  Hash,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useLojasVMPay, type LojaVMPay } from "@/hooks/useLojasVMPay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function statusInfo(l: LojaVMPay): { rotulo: string; ativo: boolean } {
  const s = (l.status ?? "").toString().toLowerCase();
  const ativo =
    l.active === true ||
    ["active", "ativo", "ativa", "enabled", "habilitado"].includes(s);
  const rotulo = l.status ? String(l.status) : ativo ? "Ativa" : "Inativa";
  return { rotulo, ativo };
}

function exportarCSV(lojas: LojaVMPay[]) {
  const cabecalho = [
    "id",
    "nome",
    "documento",
    "email",
    "telefone",
    "endereco",
    "cidade",
    "estado",
    "status",
  ];
  const linhas = lojas.map((l) =>
    [
      l.id,
      l.name,
      l.document ?? "",
      l.email ?? "",
      l.phone ?? "",
      l.address ?? "",
      l.city ?? "",
      l.state ?? "",
      statusInfo(l).rotulo,
    ]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [cabecalho.join(","), ...linhas].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lojas-vmpay-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PaginaLojas() {
  const { workspaceAtual } = useWorkspaceStore();
  const { data, isLoading, error, refetch, isFetching } = useLojasVMPay(workspaceAtual?.id);
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState("cards");

  const lojas = data ?? [];

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return lojas;
    return lojas.filter((l) =>
      [l.name, l.city, l.state, l.document, l.email, String(l.id)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [lojas, busca]);

  const ordenadas = useMemo(
    () => [...filtradas].sort((a, b) => a.name.localeCompare(b.name)),
    [filtradas],
  );

  const porEstado = useMemo(() => {
    const m = new Map<string, LojaVMPay[]>();
    for (const l of ordenadas) {
      const k = (l.state || "Sem UF").toString().toUpperCase();
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(l);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ordenadas]);

  const porCidade = useMemo(() => {
    const m = new Map<string, LojaVMPay[]>();
    for (const l of ordenadas) {
      const k = `${l.city || "Sem cidade"}${l.state ? " / " + l.state : ""}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(l);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ordenadas]);

  const estatisticas = useMemo(() => {
    const total = lojas.length;
    const ativas = lojas.filter((l) => statusInfo(l).ativo).length;
    const estados = new Set(
      lojas.map((l) => (l.state || "").toString()).filter(Boolean),
    ).size;
    const cidades = new Set(
      lojas.map((l) => (l.city || "").toString()).filter(Boolean),
    ).size;
    return { total, ativas, estados, cidades };
  }, [lojas]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lojas</h1>
          <p className="text-sm text-muted-foreground">
            Lojas sincronizadas da sua conta VMPay.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportarCSV(ordenadas)}
            disabled={!ordenadas.length}
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <CartaoStat icone={Store} rotulo="Total" valor={estatisticas.total} />
        <CartaoStat
          icone={CheckCircle2}
          rotulo="Ativas"
          valor={estatisticas.ativas}
          destaque
        />
        <CartaoStat icone={Building2} rotulo="Cidades" valor={estatisticas.cidades} />
        <CartaoStat icone={MapPin} rotulo="Estados" valor={estatisticas.estados} />
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, cidade, estado, documento, e-mail ou ID..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando lojas...
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <div className="flex-1">
            <p className="font-medium">Não foi possível carregar as lojas.</p>
            <p className="opacity-80">{(error as Error).message}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <Tabs value={aba} onValueChange={setAba} className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="cards">
              <LayoutGrid className="h-4 w-4" /> Cards
            </TabsTrigger>
            <TabsTrigger value="tabela">
              <Rows3 className="h-4 w-4" /> Tabela
            </TabsTrigger>
            <TabsTrigger value="estados">
              <MapPin className="h-4 w-4" /> Por estado
            </TabsTrigger>
            <TabsTrigger value="cidades">
              <Building2 className="h-4 w-4" /> Por cidade
            </TabsTrigger>
            <TabsTrigger value="compacto">
              <Hash className="h-4 w-4" /> Compacto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-0">
            {ordenadas.length === 0 ? (
              <Vazio />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ordenadas.map((l) => (
                  <CartaoLoja key={l.id} loja={l} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tabela" className="mt-0">
            <div className="rounded-2xl border border-border bg-card">
              <ScrollArea className="max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cidade / UF</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenadas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          Nenhuma loja encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ordenadas.map((l) => {
                        const s = statusInfo(l);
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              #{l.id}
                            </TableCell>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {[l.city, l.state].filter(Boolean).join(" / ") || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {l.email || l.phone || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={s.ativo ? "default" : "secondary"}
                                className={cn(
                                  s.ativo
                                    ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {s.rotulo}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="estados" className="mt-0 space-y-4">
            {porEstado.length === 0 ? (
              <Vazio />
            ) : (
              porEstado.map(([uf, lista]) => (
                <Grupo key={uf} titulo={uf} contagem={lista.length}>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {lista.map((l) => (
                      <LinhaCompacta key={l.id} loja={l} />
                    ))}
                  </div>
                </Grupo>
              ))
            )}
          </TabsContent>

          <TabsContent value="cidades" className="mt-0 space-y-4">
            {porCidade.length === 0 ? (
              <Vazio />
            ) : (
              porCidade.map(([cid, lista]) => (
                <Grupo key={cid} titulo={cid} contagem={lista.length}>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {lista.map((l) => (
                      <LinhaCompacta key={l.id} loja={l} />
                    ))}
                  </div>
                </Grupo>
              ))
            )}
          </TabsContent>

          <TabsContent value="compacto" className="mt-0">
            {ordenadas.length === 0 ? (
              <Vazio />
            ) : (
              <div className="rounded-2xl border border-border bg-card">
                <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3">
                  {ordenadas.map((l) => (
                    <LinhaCompacta key={l.id} loja={l} className="rounded-none border-0" />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function CartaoStat({
  icone: Icone,
  rotulo,
  valor,
  destaque,
}: {
  icone: typeof Store;
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4",
        destaque && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </span>
        <Icone className={cn("h-4 w-4", destaque ? "text-primary" : "text-muted-foreground")} />
      </div>
      <p className="mt-1 text-2xl font-semibold">{valor.toLocaleString("pt-BR")}</p>
    </div>
  );
}

function CartaoLoja({ loja }: { loja: LojaVMPay }) {
  const s = statusInfo(loja);
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store className="h-4 w-4" />
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            s.ativo
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {s.ativo ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {s.rotulo}
        </Badge>
      </div>
      <h3 className="mt-3 line-clamp-2 font-medium leading-snug">{loja.name}</h3>
      <p className="text-xs text-muted-foreground">#{loja.id}</p>
      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {(loja.city || loja.state) && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {[loja.city, loja.state].filter(Boolean).join(" / ")}
          </p>
        )}
        {loja.email && (
          <p className="flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{loja.email}</span>
          </p>
        )}
        {loja.phone && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            {loja.phone}
          </p>
        )}
      </div>
    </div>
  );
}

function LinhaCompacta({
  loja,
  className,
}: {
  loja: LojaVMPay;
  className?: string;
}) {
  const s = statusInfo(loja);
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2",
        className,
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          s.ativo ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{loja.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[loja.city, loja.state].filter(Boolean).join(" / ") || `#${loja.id}`}
        </p>
      </div>
      <span className="text-xs font-mono text-muted-foreground">#{loja.id}</span>
    </div>
  );
}

function Grupo({
  titulo,
  contagem,
  children,
}: {
  titulo: string;
  contagem: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <Badge variant="secondary">{contagem}</Badge>
      </header>
      {children}
    </section>
  );
}

function Vazio() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
      Nenhuma loja encontrada.
    </div>
  );
}
