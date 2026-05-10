import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdicionarComentario,
  useComentariosChecklist,
  useExcluirComentario,
} from "@/hooks/useComentariosChecklist";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Props {
  checklistId: string;
  workspaceId: string;
  className?: string;
  compact?: boolean;
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function PainelComentarios({ checklistId, workspaceId, className, compact }: Props) {
  const { data: comentarios, isLoading } = useComentariosChecklist(checklistId);
  const adicionar = useAdicionarComentario();
  const excluir = useExcluirComentario();
  const [conteudo, setConteudo] = useState("");

  const { data: usuario } = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
  });

  const enviar = () => {
    if (!conteudo.trim()) return;
    adicionar.mutate(
      { checklistId, workspaceId, conteudo },
      {
        onSuccess: () => setConteudo(""),
        onError: (e: Error) =>
          toast.error("Não foi possível comentar.", { description: e.message }),
      },
    );
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className={cn("flex-1 space-y-3 overflow-y-auto", compact ? "max-h-[320px]" : "")}>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (comentarios ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhum comentário ainda. Seja o primeiro a registrar o andamento.
          </p>
        ) : (
          (comentarios ?? []).map((c) => {
            const meu = usuario === c.autor_id;
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                    {iniciais(c.autor_nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-card px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{c.autor_nome}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.criado_em), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {meu && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Excluir este comentário?")) excluir.mutate(c.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.conteudo}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
        <Textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Escreva uma atualização sobre esta inauguração..."
          rows={3}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Ctrl+Enter para enviar</span>
          <Button size="sm" onClick={enviar} disabled={!conteudo.trim() || adicionar.isPending}>
            {adicionar.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Comentar
          </Button>
        </div>
      </div>
    </div>
  );
}
