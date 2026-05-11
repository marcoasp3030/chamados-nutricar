import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Canais, useInscricaoRealtime } from "@/realtime/atual";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronRight, Loader2, Sparkles, AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  chamadoId: string;
}

interface ExecucaoIA {
  id: string;
  acao: string;
  modelo: string | null;
  resultado: string | null;
  erro: string | null;
  criado_em: string;
  usuario_id: string | null;
  perfil?: { nome: string } | null;
}

const ROTULO_ACAO: Record<string, string> = {
  resumir: "Resumo",
  sugerir_resposta: "Sugestão de resposta",
  classificar: "Classificação",
};

export function HistoricoIAChamado({ chamadoId }: Props) {
  const queryClient = useQueryClient();
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["ia-execucoes", chamadoId],
    queryFn: async () => {
      const { data, error } = await dados
        .from("chamado_ia_execucoes")
        .select("*")
        .eq("chamado_id", chamadoId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      const execs = (data ?? []) as ExecucaoIA[];
      const ids = Array.from(new Set(execs.map((e) => e.usuario_id).filter(Boolean))) as string[];
      if (ids.length > 0) {
        const { data: perfis } = await dados
          .from("perfis")
          .select("id, nome")
          .in("id", ids);
        const mapa = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
        for (const e of execs) {
          if (e.usuario_id) e.perfil = { nome: mapa.get(e.usuario_id) ?? "—" };
        }
      }
      return execs;
    },
  });

  // Atualiza quando uma nova execução é registrada
  useInscricaoRealtime(
    Canais.iaExecucoes(chamadoId),
    () => queryClient.invalidateQueries({ queryKey: ["ia-execucoes", chamadoId] }),
    [chamadoId, queryClient],
  );

  function alternar(id: string) {
    setExpandidos((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <Sparkles className="mx-auto mb-2 h-5 w-5" />
        Nenhuma execução de IA registrada neste chamado.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {data.map((exec) => {
        const aberto = expandidos.has(exec.id);
        const conteudo = exec.erro || exec.resultado || "";
        return (
          <li
            key={exec.id}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <button
              type="button"
              onClick={() => alternar(exec.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
            >
              {aberto ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {exec.erro ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {ROTULO_ACAO[exec.acao] ?? exec.acao}
                  </span>
                  {exec.modelo && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {exec.modelo}
                    </span>
                  )}
                  {exec.erro && (
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                      Falha
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(exec.criado_em), "dd 'de' MMM yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                  {exec.perfil?.nome ? ` · por ${exec.perfil.nome}` : ""}
                </div>
              </div>
            </button>

            {aberto && (
              <div className="border-t border-border bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(conteudo);
                      toast.success("Copiado.");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {conteudo || "(sem conteúdo)"}
                </pre>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
