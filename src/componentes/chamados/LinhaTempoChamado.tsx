import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare, GitBranch, Activity, Plus, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

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
  usuarioNome: string;
  acao: string;
  detalhe?: string | null;
  interno?: boolean;
  campo?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
}

async function carregarPerfis(ids: string[]) {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map<string, { id: string; nome: string }>();
  const { data } = await supabase.from("perfis").select("id, nome").in("id", unicos);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export function LinhaTempoChamado({ chamadoId, numeroPrincipal }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["linha-tempo", chamadoId],
    queryFn: async (): Promise<Evento[]> => {
      // Carrega chamado principal e subchamados
      const { data: principal } = await supabase
        .from("chamados")
        .select("id, numero, titulo, criado_em, criado_por, solicitante_id, responsavel_id")
        .eq("id", chamadoId)
        .maybeSingle();
      const { data: subs } = await supabase
        .from("chamados")
        .select("id, numero, titulo, criado_em, criado_por, solicitante_id, responsavel_id")
        .eq("chamado_pai_id", chamadoId);

      const lista = [principal, ...(subs ?? [])].filter(Boolean) as Array<{
        id: string;
        numero: number;
        titulo: string;
        criado_em: string;
        criado_por: string;
        solicitante_id: string;
        responsavel_id: string | null;
      }>;
      if (lista.length === 0) return [];

      const ids = lista.map((c) => c.id);

      const [hist, coms] = await Promise.all([
        supabase
          .from("chamado_historico")
          .select("*")
          .in("chamado_id", ids)
          .order("criado_em", { ascending: true }),
        supabase
          .from("chamado_comentarios")
          .select("*")
          .in("chamado_id", ids)
          .order("criado_em", { ascending: true }),
      ]);

      const usuarioIds: string[] = [];
      lista.forEach((c) => usuarioIds.push(c.criado_por));
      (hist.data ?? []).forEach((h) => h.usuario_id && usuarioIds.push(h.usuario_id));
      (coms.data ?? []).forEach((c) => usuarioIds.push(c.autor_id));
      const perfis = await carregarPerfis(usuarioIds);

      const meta = new Map(
        lista.map((c) => [c.id, { numero: c.numero, titulo: c.titulo, ehPrincipal: c.id === chamadoId }]),
      );

      const eventos: Evento[] = [];

      // Eventos de criação
      lista.forEach((c) => {
        eventos.push({
          id: `criacao-${c.id}`,
          chamadoId: c.id,
          numero: c.numero,
          tituloChamado: c.titulo,
          ehPrincipal: c.id === chamadoId,
          tipo: "criacao",
          data: c.criado_em,
          usuarioNome: perfis.get(c.criado_por)?.nome ?? "Sistema",
          acao: c.id === chamadoId ? "abriu o chamado" : "abriu subchamado",
        });
      });

      (hist.data ?? []).forEach((h: any) => {
        const m = meta.get(h.chamado_id);
        if (!m) return;
        // Pula evento "criou o chamado" pois já temos o de criação
        if (h.acao === "criou o chamado") return;
        eventos.push({
          id: `h-${h.id}`,
          chamadoId: h.chamado_id,
          numero: m.numero,
          tituloChamado: m.titulo,
          ehPrincipal: m.ehPrincipal,
          tipo: "historico",
          data: h.criado_em,
          usuarioNome: (h.usuario_id && perfis.get(h.usuario_id)?.nome) || "Sistema",
          acao: h.acao,
          campo: h.campo,
          valorAnterior: h.valor_anterior,
          valorNovo: h.valor_novo,
        });
      });

      (coms.data ?? []).forEach((c: any) => {
        const m = meta.get(c.chamado_id);
        if (!m) return;
        eventos.push({
          id: `c-${c.id}`,
          chamadoId: c.chamado_id,
          numero: m.numero,
          tituloChamado: m.titulo,
          ehPrincipal: m.ehPrincipal,
          tipo: "comentario",
          data: c.criado_em,
          usuarioNome: perfis.get(c.autor_id)?.nome ?? "Usuário",
          acao: c.interno ? "adicionou comentário interno" : "adicionou comentário",
          detalhe: c.conteudo,
          interno: c.interno,
        });
      });

      eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      return eventos;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem eventos para exibir.</p>;
  }

  return (
    <ol className="space-y-4 border-l border-border pl-5">
      {data.map((e) => {
        const Icone =
          e.tipo === "comentario" ? MessageSquare : e.tipo === "criacao" ? Plus : Activity;
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[29px] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background">
              <Icone className="h-3 w-3 text-primary" />
            </span>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{e.usuarioNome}</span>
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
    </ol>
  );
}
