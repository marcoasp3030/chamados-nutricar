import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronsUpDown,
  FileText,
  Flag,
  Loader2,
  Paperclip,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  UserCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { useCategoriasChamado } from "@/componentes/configuracoes/AbaCategorias";
import { useDepartamentos } from "@/componentes/configuracoes/AbaDepartamentos";
import { Building2 } from "lucide-react";
import { SeletorLoja } from "@/componentes/chamados/SeletorLoja";
import { SeletorAnexos } from "@/componentes/chamados/SeletorAnexos";
import {
  ItensRequisicao,
  itemRequisicaoVazio,
  type ItemRequisicao,
} from "@/componentes/chamados/ItensRequisicao";
import { Switch } from "@/components/ui/switch";
import { db } from "@/dados/atual";
import {
  PRIORIDADES_CHAMADO,
  STATUS_CHAMADO,
  TIPOS_CHAMADO,
  type Chamado,
  type PrioridadeChamado,
  type StatusChamado,
  type TipoChamado,
} from "@/tipos/chamado";
import {
  rotuloPrioridade,
  rotuloStatusChamado,
  rotuloTipoChamado,
} from "@/utilitarios/traducoes";

export interface DadosFormularioChamado {
  titulo: string;
  descricao: string;
  tipo: TipoChamado;
  prioridade: PrioridadeChamado;
  status: StatusChamado;
  categoria: string;
  loja: string | null;
  responsavel_id: string | null;
  departamento_id: string | null;
  prazo: string | null;
  chamado_pai_id: string | null;
  anexos: File[];
  requisicao_compras: boolean;
  itens_requisicao: ItemRequisicao[];
}

interface Props {
  workspaceId: string;
  inicial?: Partial<Chamado>;
  permiteEditarStatus?: boolean;
  chamadoPaiId?: string | null;
  enviando?: boolean;
  rotuloEnvio?: string;
  aoCancelar?: () => void;
  aoEnviar: (dados: DadosFormularioChamado) => void | Promise<void>;
}

const CORES_PRIO: Record<PrioridadeChamado, string> = {
  Baixa: "bg-slate-400",
  Media: "bg-blue-500",
  Alta: "bg-orange-500",
  Urgente: "bg-red-500",
};

function Cartao({
  titulo,
  icone: Icone,
  children,
  acoes,
  className,
}: {
  titulo: string;
  icone: typeof FileText;
  children: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Icone className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
        </div>
        {acoes}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function FormularioChamado({
  workspaceId,
  inicial,
  permiteEditarStatus = false,
  chamadoPaiId = null,
  enviando = false,
  rotuloEnvio = "Criar chamado",
  aoCancelar,
  aoEnviar,
}: Props) {
  const { data: membros } = useMembrosWorkspace(workspaceId);
  const { data: categorias } = useCategoriasChamado(workspaceId);
  const { data: departamentos } = useDepartamentos(workspaceId);
  const [dados, setDados] = useState<DadosFormularioChamado>({
    titulo: inicial?.titulo ?? "",
    descricao: inicial?.descricao ?? "",
    tipo: (inicial?.tipo as TipoChamado) ?? "Solicitacao",
    prioridade: (inicial?.prioridade as PrioridadeChamado) ?? "Media",
    status: (inicial?.status as StatusChamado) ?? "Aberto",
    categoria: inicial?.categoria ?? "",
    loja: (inicial as { loja?: string | null } | undefined)?.loja ?? null,
    responsavel_id: inicial?.responsavel_id ?? null,
    departamento_id: (inicial as { departamento_id?: string | null } | undefined)?.departamento_id ?? null,
    prazo: inicial?.prazo ?? null,
    chamado_pai_id: chamadoPaiId ?? inicial?.chamado_pai_id ?? null,
    anexos: [],
    requisicao_compras: false,
    itens_requisicao: [],
  });

  useEffect(() => {
    if (chamadoPaiId) setDados((d) => ({ ...d, chamado_pai_id: chamadoPaiId }));
  }, [chamadoPaiId]);

  // Subchamados herdam categoria (e por consequência o SLA) e prazo do chamado pai.
  const { data: chamadoPai } = useQuery({
    queryKey: ["chamado-pai-para-form", chamadoPaiId],
    enabled: !!chamadoPaiId,
    queryFn: async () => {
      const { data, error } = await db
        .from("chamados")
        .select("categoria, prazo")
        .eq("id", chamadoPaiId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!chamadoPai || !chamadoPaiId) return;
    setDados((d) => {
      // Só herda quando o usuário ainda não tocou nesses campos
      if (d.categoria || d.prazo) return d;
      const categoriaPai = chamadoPai.categoria ?? "";
      const cat = (categorias ?? []).find((c) => c.nome === categoriaPai);
      let prazo = d.prazo;
      if (cat?.sla_resolucao_horas) {
        const dt = new Date();
        dt.setHours(dt.getHours() + cat.sla_resolucao_horas);
        prazo = dt.toISOString();
      } else if (chamadoPai.prazo) {
        prazo = chamadoPai.prazo;
      }
      return { ...d, categoria: categoriaPai, prazo };
    });
  }, [chamadoPai, chamadoPaiId, categorias]);

  const [corrigindo, setCorrigindo] = useState(false);
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [observadorAberto, setObservadorAberto] = useState(false);

  function atualizar<K extends keyof DadosFormularioChamado>(
    chave: K,
    valor: DadosFormularioChamado[K],
  ) {
    setDados((d) => ({ ...d, [chave]: valor }));
  }

  async function corrigirEscrita() {
    const texto = dados.descricao.trim();
    if (!texto) {
      toast.error("Escreva uma descrição primeiro.");
      return;
    }
    setCorrigindo(true);
    try {
      const { data, error } = await supabase.functions.invoke("ia-chamado", {
        body: {
          workspace_id: workspaceId,
          acao: "corrigir_escrita",
          texto,
        },
      });
      if (error) throw error;
      const resp = data as { error?: string; resultado?: string };
      if (resp.error) throw new Error(resp.error);
      const corrigido = (resp.resultado ?? "").trim();
      if (!corrigido) throw new Error("Não foi possível corrigir.");
      atualizar("descricao", corrigido);
      toast.success("Descrição corrigida pela IA.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      toast.error("Falha ao corrigir", { description: msg });
    } finally {
      setCorrigindo(false);
    }
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    setTentouEnviar(true);
    if (!dados.titulo.trim()) {
      toast.error("Informe um título para o chamado.");
      return;
    }
    if (!dados.departamento_id) {
      toast.error("Selecione o departamento de destino do chamado.");
      return;
    }
    aoEnviar({ ...dados, titulo: dados.titulo.trim() });
  }

  const tituloInvalido = tentouEnviar && !dados.titulo.trim();
  const deptoInvalido = tentouEnviar && !dados.departamento_id;

  return (
    <form onSubmit={submeter} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-5 lg:col-span-2">
          <Cartao titulo="Conteúdo" icone={FileText}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="titulo" className="text-sm font-medium">
                  Título <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {dados.titulo.length}/200
                </span>
              </div>
              <Input
                id="titulo"
                required
                maxLength={200}
                placeholder="Ex.: Máquina X parou de aceitar pagamento"
                value={dados.titulo}
                onChange={(e) => atualizar("titulo", e.target.value)}
                className={cn(
                  "h-11 text-base",
                  tituloInvalido && "border-destructive focus-visible:ring-destructive",
                )}
                aria-invalid={tituloInvalido}
              />
              {tituloInvalido && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" /> Informe um título para continuar.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="descricao" className="text-sm font-medium">
                  Descrição
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    onClick={corrigirEscrita}
                    disabled={corrigindo || !dados.descricao.trim()}
                    title="Corrigir ortografia, gramática e clareza com IA"
                  >
                    {corrigindo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    )}
                    Corrigir escrita
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {dados.descricao.length}/5000
                  </span>
                </div>
              </div>
              <Textarea
                id="descricao"
                rows={6}
                maxLength={5000}
                placeholder="Descreva detalhes, passos para reproduzir, mensagens de erro, contexto da loja, etc."
                value={dados.descricao}
                onChange={(e) => atualizar("descricao", e.target.value)}
                className="resize-y"
                disabled={corrigindo}
              />
              <p className="text-xs text-muted-foreground">
                Quanto mais detalhes, mais rápido o atendimento. Use “Corrigir escrita” para revisar com IA.
              </p>
            </div>
          </Cartao>

          {(() => {
            const deptoSel = (departamentos ?? []).find(
              (d) => d.id === dados.departamento_id,
            );
            const ehCompras =
              !!deptoSel && deptoSel.nome.trim().toLowerCase() === "compras";
            if (!ehCompras) return null;
            return (
              <Cartao
                titulo="Requisição de Compras"
                icone={ShoppingCart}
                acoes={
                  <Switch
                    checked={dados.requisicao_compras}
                    onCheckedChange={(ativo) => {
                      setDados((d) => ({
                        ...d,
                        requisicao_compras: ativo,
                        itens_requisicao:
                          ativo && d.itens_requisicao.length === 0
                            ? [itemRequisicaoVazio()]
                            : d.itens_requisicao,
                      }));
                    }}
                    aria-label="Ativar requisição de compras"
                  />
                }
              >
                {dados.requisicao_compras ? (
                  <ItensRequisicao
                    itens={dados.itens_requisicao}
                    aoMudar={(itens) => atualizar("itens_requisicao", itens)}
                    desabilitado={enviando}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ative para informar uma lista de itens a serem comprados pelo time de
                    compras.
                  </p>
                )}
              </Cartao>
            );
          })()}

          <Cartao titulo="Anexos" icone={Paperclip}>
            <SeletorAnexos
              arquivos={dados.anexos}
              aoMudar={(arquivos) => atualizar("anexos", arquivos)}
              desabilitado={enviando}
            />
          </Cartao>
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-5 lg:col-span-1">
          <Cartao titulo="Classificação" icone={Flag}>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tipo
              </Label>
              <Select
                value={dados.tipo}
                onValueChange={(v) => atualizar("tipo", v as TipoChamado)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CHAMADO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {rotuloTipoChamado[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Prioridade
              </Label>
              <Select
                value={dados.prioridade}
                onValueChange={(v) => atualizar("prioridade", v as PrioridadeChamado)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES_CHAMADO.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", CORES_PRIO[p])} />
                        {rotuloPrioridade[p]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {permiteEditarStatus && (
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status inicial
                </Label>
                <Select
                  value={dados.status}
                  onValueChange={(v) => atualizar("status", v as StatusChamado)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CHAMADO.map((s) => (
                      <SelectItem key={s} value={s}>
                        {rotuloStatusChamado[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Tag className="h-3 w-3" /> Categoria
              </Label>
              <Select
                value={dados.categoria || "__nenhuma__"}
                onValueChange={(v) => {
                  const novaCategoria = v === "__nenhuma__" ? "" : v;
                  const cat = (categorias ?? []).find((c) => c.nome === novaCategoria);
                  setDados((d) => {
                    let prazo = d.prazo;
                    if (cat?.sla_resolucao_horas && !d.prazo) {
                      const dt = new Date();
                      dt.setHours(dt.getHours() + cat.sla_resolucao_horas);
                      prazo = dt.toISOString();
                    }
                    // Se a categoria tiver departamento vinculado, preenche/sobrescreve.
                    let departamento_id = d.departamento_id;
                    let requisicao_compras = d.requisicao_compras;
                    let itens_requisicao = d.itens_requisicao;
                    let responsavel_id = d.responsavel_id;
                    if (cat?.departamento_id) {
                      departamento_id = cat.departamento_id;
                      responsavel_id = null;
                      const dep = (departamentos ?? []).find((x) => x.id === cat.departamento_id);
                      const ehCompras = !!dep && dep.nome.trim().toLowerCase() === "compras";
                      if (!ehCompras) {
                        requisicao_compras = false;
                        itens_requisicao = [];
                      }
                    }
                    return {
                      ...d,
                      categoria: novaCategoria,
                      prazo,
                      departamento_id,
                      responsavel_id,
                      requisicao_compras,
                      itens_requisicao,
                    };
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__nenhuma__">Sem categoria</SelectItem>
                  {(categorias ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.nome}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.cor }}
                        />
                        <span className="flex-1">{c.nome}</span>
                        {c.sla_resolucao_horas != null && (
                          <span className="text-xs text-muted-foreground">
                            SLA {c.sla_resolucao_horas}h
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                  {dados.categoria &&
                    !(categorias ?? []).some((c) => c.nome === dados.categoria) && (
                      <SelectItem value={dados.categoria}>{dados.categoria}</SelectItem>
                    )}
                </SelectContent>
              </Select>
              {(() => {
                const cat = (categorias ?? []).find((c) => c.nome === dados.categoria);
                if (!cat) return null;
                if (cat.sla_resposta_horas == null && cat.sla_resolucao_horas == null) return null;
                return (
                  <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {cat.sla_resposta_horas != null && (
                      <span>SLA resposta: <strong className="text-foreground">{cat.sla_resposta_horas}h</strong></span>
                    )}
                    {cat.sla_resolucao_horas != null && (
                      <span>SLA resolução: <strong className="text-foreground">{cat.sla_resolucao_horas}h</strong></span>
                    )}
                  </p>
                );
              })()}
              {(!categorias || categorias.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Cadastre categorias em Configurações → Categorias.
                </p>
              )}
            </div>
          </Cartao>

          <Cartao titulo="Atribuição e prazo" icone={UserCircle2}>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Building2 className="h-3 w-3" /> Departamento destino <span className="text-destructive">*</span>
              </Label>
              <Select
                value={dados.departamento_id ?? ""}
                onValueChange={(v) => {
                  const dep = (departamentos ?? []).find((x) => x.id === v);
                  const ehCompras =
                    !!dep && dep.nome.trim().toLowerCase() === "compras";
                  setDados((d) => ({
                    ...d,
                    departamento_id: v,
                    // Ao escolher um departamento, limpamos o responsável individual:
                    // todos os membros do departamento ficam vinculados.
                    responsavel_id: null,
                    // Se mudou para um depto que não é Compras, desativa a requisição.
                    requisicao_compras: ehCompras ? d.requisicao_compras : false,
                    itens_requisicao: ehCompras ? d.itens_requisicao : [],
                  }));
                }}
              >
                <SelectTrigger
                  className={cn(deptoInvalido && "border-destructive focus-visible:ring-destructive")}
                  aria-invalid={deptoInvalido}
                >
                  <SelectValue placeholder="Selecionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {(departamentos ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {deptoInvalido && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" /> O chamado precisa ser destinado a um departamento.
                </p>
              )}
              {(!departamentos || departamentos.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Cadastre departamentos em Configurações → Departamentos.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Todos os membros do departamento destino terão acesso ao chamado e poderão atribuí-lo.
              </p>

              {dados.departamento_id && (() => {
                const responsaveis = (membros ?? []).filter((m) =>
                  m.departamento_ids.includes(dados.departamento_id!),
                );
                const depNome = (departamentos ?? []).find(
                  (d) => d.id === dados.departamento_id,
                )?.nome;
                return (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-medium text-foreground">
                      Receberão este chamado em <strong>{depNome}</strong>
                      <span className="ml-1 text-muted-foreground">({responsaveis.length})</span>
                    </p>
                    {responsaveis.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum membro vinculado a este departamento ainda.
                      </p>
                    ) : (
                      <ul className="flex flex-wrap gap-1.5">
                        {responsaveis.map((m) => (
                          <li
                            key={m.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-xs"
                            title={m.perfil.email}
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                              {(m.perfil.nome || m.perfil.email || "?").charAt(0).toUpperCase()}
                            </span>
                            <span className="font-medium">{m.perfil.nome || m.perfil.email}</span>
                            {m.cargo && (
                              <span className="text-muted-foreground">· {m.cargo}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>


            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Observador
              </Label>
              {(() => {
                const selecionado = (membros ?? []).find(
                  (m) => m.usuario_id === dados.responsavel_id,
                );
                const depSel = selecionado
                  ? (departamentos ?? []).find(
                      (d) => d.id === selecionado.departamento_id,
                    )
                  : null;
                return (
                  <Popover open={observadorAberto} onOpenChange={setObservadorAberto}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={observadorAberto}
                        disabled={!!dados.departamento_id}
                        className="w-full justify-between font-normal"
                      >
                        <span className="flex items-center gap-2 truncate text-left">
                          <UserCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {selecionado ? (
                            <span className="flex flex-col truncate">
                              <span className="truncate text-sm">{selecionado.perfil.nome}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {depSel?.nome ?? "Sem departamento"}
                              </span>
                            </span>
                          ) : (
                            <span className="truncate text-muted-foreground">
                              Selecionar observador
                            </span>
                          )}
                        </span>
                        {selecionado ? (
                          <X
                            className="h-4 w-4 shrink-0 opacity-60 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              atualizar("responsavel_id", null);
                            }}
                          />
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command
                        filter={(value, search) =>
                          value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                        }
                      >
                        <CommandInput placeholder="Buscar por nome ou departamento..." />
                        <CommandList>
                          <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="sem observador"
                              onSelect={() => {
                                atualizar("responsavel_id", null);
                                setObservadorAberto(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !dados.responsavel_id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              Sem observador
                            </CommandItem>
                            {(membros ?? []).map((m) => {
                              const dep = (departamentos ?? []).find(
                                (d) => d.id === m.departamento_id,
                              );
                              const depNome = dep?.nome ?? "Sem departamento";
                              return (
                                <CommandItem
                                  key={m.usuario_id}
                                  value={`${m.perfil.nome} ${depNome} ${m.perfil.email ?? ""}`}
                                  onSelect={() => {
                                    atualizar("responsavel_id", m.usuario_id);
                                    setObservadorAberto(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      dados.responsavel_id === m.usuario_id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <span className="flex flex-col">
                                    <span className="text-sm">{m.perfil.nome}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {depNome}
                                    </span>
                                  </span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                );
              })()}
              {dados.departamento_id ? (
                <p className="text-xs text-muted-foreground">
                  Todos os membros do departamento selecionado ficam vinculados automaticamente.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  O observador acompanha o chamado e enxerga toda a interação.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="prazo"
                className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                <CalendarClock className="h-3 w-3" /> Prazo
              </Label>
              <Input
                id="prazo"
                type="datetime-local"
                value={dados.prazo ? dados.prazo.slice(0, 16) : ""}
                onChange={(e) =>
                  atualizar(
                    "prazo",
                    e.target.value ? new Date(e.target.value).toISOString() : null,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Store className="h-3 w-3" /> Loja
              </Label>
              <SeletorLoja
                workspaceId={workspaceId}
                valor={dados.loja}
                aoMudar={(v) => atualizar("loja", v)}
              />
              <p className="text-xs text-muted-foreground">
                Lojas sincronizadas da VMPay.
              </p>
            </div>
          </Cartao>
        </aside>
      </div>

      {/* Barra de ação fixa no rodapé */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:-mx-0 md:rounded-2xl md:border md:px-5 md:shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Os campos marcados com <span className="text-destructive">*</span> são
            obrigatórios.
          </p>
          <div className="flex items-center gap-2">
            {aoCancelar && (
              <Button
                type="button"
                variant="ghost"
                onClick={aoCancelar}
                disabled={enviando}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={enviando || !dados.titulo.trim()}
              className="min-w-[160px]"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              {rotuloEnvio}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
