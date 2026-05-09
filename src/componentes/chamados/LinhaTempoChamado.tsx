import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, GitBranch, Activity, Plus, Lock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  chamadoId: string;
  numeroPrincipal: number;
}

type EventoTipo = "criacao" | "historico" | "comentario";

interface Evento {
  id: string;
  chamadoId: string;
  numero: number;
  tituloChamado: string;
  ehPrincipal: boolean;
  tipo: EventoTipo;
  data: string;
  usuarioId: string | null;
  acao: string;
  detalhe?: string | null;
  interno?: boolean;
  campo?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
}

interface ChamadoMeta {
  id: string;
  numero: number;
  titulo: string;
  criado_em: string;
  criado_por: string;
  ehPrincipal: boolean;
}

export function LinhaTempoChamado({ chamadoId, numeroPrincipal }: Props) {
  // 1. Chamado principal (rápido)
  const principal = useQuery({
    queryKey: ["lt-principal", chamadoId],
    queryFn: async (): Promise<ChamadoMeta | null> => {
      const { data, error } = await supabase
        .from("chamados")
        .select("id, numero, titulo, criado_em, criado_por")
        .eq("id", chamadoId)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...data, ehPrincipal: true } : null;
    },
  });

  // 2. Subchamados
  const subs = useQuery({
    queryKey: ["lt-subs", chamadoId],
    queryFn: async (): Promise<ChamadoMeta[]> => {
      const { data, error } = await supabase
        .from("chamados")
        .select("id, numero, titulo, criado_em, criado_por")
        .eq("chamado_pai_id", chamadoId);
      if (error) throw error;
      return (data ?? []).map((c) => ({ ...c, ehPrincipal: false }));
    },
  });

  const todosChamados = useMemo<ChamadoMeta[]>(() => {
    const lista: ChamadoMeta[] = [];
    if (principal.data) lista.push(principal.data);
    if (subs.data) lista.push(...subs.data);
    return lista;
  }, [principal.data, subs.data]);

  const idsChamados = useMemo(() => todosChamados.map((c) => c.id), [todosChamados]);
  const chaveIds = idsChamados.slice().sort().join(",");

  // 3. Histórico (depende dos ids carregados)
  const historico = useQuery({
    queryKey: ["lt-historico", chaveIds],
    enabled: idsChamados.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamado_historico")
        .select("*")
        .in("chamado_id", idsChamados);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 4. Comentários (depende dos ids carregados)
  const comentarios = useQuery({
    queryKey: ["lt-comentarios", chaveIds],
    enabled: idsChamados.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamado_comentarios")
        .select("*")
        .in("chamado_id", idsChamados);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 5. Perfis dos usuários envolvidos (depende de tudo acima)
  const usuarioIds = useMemo(() => {
    const ids = new Set<string>();
    todosChamados.forEach((c) => ids.add(c.criado_por));
    (historico.data ?? []).forEach((h: any) => h.usuario_id && ids.add(h.usuario_id));
    (comentarios.data ?? []).forEach((c: any) => ids.add(c.autor_id));
    return Array.from(ids);
  }, [todosChamados, historico.data, comentarios.data]);

  const chaveUsuarios = usuarioIds.slice().sort().join(",");

  const perfis = useQuery({
    queryKey: ["lt-perfis", chaveUsuarios],
    enabled: usuarioIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis")
        .select("id, nome")
        .in("id", usuarioIds);
      if (error) throw error;
      return new Map((data ?? []).map((p) => [p.id, p]));
    },
  });

  // Monta eventos progressivamente conforme dados chegam
  const eventos = useMemo<Evento[]>(() => {
    if (todosChamados.length === 0) return [];
    const meta = new Map(
      todosChamados.map((c) => [c.id, { numero: c.numero, titulo: c.titulo, ehPrincipal: c.ehPrincipal }]),
    );
    const nome = (id: string | null | undefined) =>
      (id && perfis.data?.get(id)?.nome) || (perfis.isFetching || !perfis.data ? "Carregando…" : "Sistema");

    const lista: Evento[] = [];

    todosChamados.forEach((c) => {
      lista.push({
        id: `criacao-${c.id}`,
        chamadoId: c.id,
        numero: c.numero,
        tituloChamado: c.titulo,
        ehPrincipal: c.ehPrincipal,
        tipo: "criacao",
        data: c.criado_em,
        usuarioId: c.criado_por,
        usuarioNome: nome(c.criado_por),
        acao: c.ehPrincipal ? "abriu o chamado" : "abriu subchamado",
      } as Evento & { usuarioNome: string });
    });

    (historico.data ?? []).forEach((h: any) => {
      const m = meta.get(h.chamado_id);
      if (!m) return;
      if (h.acao === "criou o chamado") return;
      lista.push({
        id: `h-${h.id}`,
        chamadoId: h.chamado_id,
        numero: m.numero,
        tituloChamado: m.titulo,
        ehPrincipal: m.ehPrincipal,
        tipo: "historico",
        data: h.criado_em,
        usuarioId: h.usuario_id,
        usuarioNome: nome(h.usuario_id),
        acao: h.acao,
        campo: h.campo,
        valorAnterior: h.valor_anterior,
        valorNovo: h.valor_novo,
      } as Evento & { usuarioNome: string });
    });

    (comentarios.data ?? []).forEach((c: any) => {
      const m = meta.get(c.chamado_id);
      if (!m) return;
      lista.push({
        id: `c-${c.id}`,
        chamadoId: c.chamado_id,
        numero: m.numero,
        tituloChamado: m.titulo,
        ehPrincipal: m.ehPrincipal,
        tipo: "comentario",
        data: c.criado_em,
        usuarioId: c.autor_id,
        usuarioNome: nome(c.autor_id),
        acao: c.interno ? "adicionou comentário interno" : "adicionou comentário",
        detalhe: c.conteudo,
        interno: c.interno,
      } as Evento & { usuarioNome: string });
    });

    lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return lista;
  }, [todosChamados, historico.data, comentarios.data, perfis.data, perfis.isFetching]);

  const carregandoInicial = principal.isLoading;
  const carregandoMais =
    subs.isLoading ||
    (idsChamados.length > 0 && (historico.isLoading || comentarios.isLoading)) ||
    (usuarioIds.length > 0 && perfis.isLoading);

  if (carregandoInicial) {
    return <EsqueletoLinhaTempo />;
  }

  if (eventos.length === 0 && !carregandoMais) {
    return <p className="text-sm text-muted-foreground">Sem eventos para exibir.</p>;
  }

  return (
    <div className="space-y-4">
      {carregandoMais && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando mais eventos…
        </div>
      )}
      <ol className="space-y-4 border-l border-border pl-5">
        {eventos.map((e) => {
          const Icone =
            e.tipo === "comentario" ? MessageSquare : e.tipo === "criacao" ? Plus : Activity;
          const usuarioNome = (e as Evento & { usuarioNome: string }).usuarioNome;
          return (
            <li key={e.id} className="relative">
              <span className="absolute -left-[29px] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background">
                <Icone className="h-3 w-3 text-primary" />
              </span>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{usuarioNome}</span>
                <span className="text-muted-foreground">{e.acao}</span>
                {!e.ehPrincipal ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    <GitBranch className="h-3 w-3" />
                    Sub #{e.numero}
                  </span>
                ) : (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Principal #{numeroPrincipal}
                  </span>
                )}
                {e.interno && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Lock className="h-3 w-3" /> Interno
                  </span>
                )}
              </div>
              {e.tipo === "historico" && e.campo && e.valorNovo && (
                <div className="mt-1 text-xs">
                  <span className="text-muted-foreground line-through">
                    {e.valorAnterior || "—"}
                  </span>{" "}
                  → <span className="font-medium">{e.valorNovo}</span>
                </div>
              )}
              {e.tipo === "comentario" && e.detalhe && (
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-sm text-foreground">
                  {e.detalhe}
                </p>
              )}
              {!e.ehPrincipal && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  em &ldquo;{e.tituloChamado}&rdquo;
                </div>
              )}
              <div className="mt-0.5 text-xs text-muted-foreground">
                {format(new Date(e.data), "dd 'de' MMM yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </li>
          );
        })}
        {carregandoMais && <EsqueletoItens quantidade={3} />}
      </ol>
    </div>
  );
}

function EsqueletoLinhaTempo() {
  return (
    <ol className="space-y-4 border-l border-border pl-5">
      <EsqueletoItens quantidade={4} />
    </ol>
  );
}

function EsqueletoItens({ quantidade }: { quantidade: number }) {
  return (
    <>
      {Array.from({ length: quantidade }).map((_, i) => (
        <li key={`sk-${i}`} className="relative">
          <span className="absolute -left-[29px] top-1 h-5 w-5 rounded-full border border-border bg-muted" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </>
  );
}
