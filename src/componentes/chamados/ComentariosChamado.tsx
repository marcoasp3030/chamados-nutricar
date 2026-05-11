import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useComentariosChamado } from "@/hooks/useChamado";
import { cn } from "@/lib/utils";
import { obterUsuarioAtual } from "@/auth/atual";
import { dados } from "@/dados/atual";

interface Props {
  chamadoId: string;
  workspaceId: string;
  podeUsarInterno: boolean;
}

export function ComentariosChamado({ chamadoId, workspaceId, podeUsarInterno }: Props) {
  const { data: comentarios, isLoading } = useComentariosChamado(chamadoId);
  const queryClient = useQueryClient();
  const [conteudo, setConteudo] = useState("");
  const [interno, setInterno] = useState(false);

  const adicionar = useMutation({
    mutationFn: async () => {
      const u = { user: await obterUsuarioAtual() };
      if (!u.user) throw new Error("Sessão expirada");
      const { error } = await dados.from("chamado_comentarios").insert({
        chamado_id: chamadoId,
        workspace_id: workspaceId,
        autor_id: u.user.id,
        conteudo: conteudo.trim(),
        interno,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setConteudo("");
      setInterno(false);
      queryClient.invalidateQueries({ queryKey: ["comentarios", chamadoId] });
      queryClient.invalidateQueries({ queryKey: ["historico", chamadoId] });
      toast.success("Comentário enviado.");
    },
    onError: (e: Error) => toast.error("Não foi possível enviar.", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Comentários</h2>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (comentarios ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há comentários neste chamado.</p>
      ) : (
        <ul className="space-y-3">
          {comentarios!.map((c) => (
            <li
              key={c.id}
              className={cn(
                "rounded-xl border border-border bg-card p-4",
                c.interno && "border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/30",
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="font-medium">{c.autor?.nome ?? "Usuário"}</span>
                {c.interno && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-200/60 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
                    <Lock className="h-3 w-3" /> Interno
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  · {format(new Date(c.criado_em), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{c.conteudo}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <Textarea
          placeholder="Escreva um comentário..."
          rows={3}
          maxLength={5000}
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
        />
        <div className="flex items-center justify-between">
          {podeUsarInterno ? (
            <div className="flex items-center gap-2">
              <Switch id="interno" checked={interno} onCheckedChange={setInterno} />
              <Label htmlFor="interno" className="text-sm">
                Comentário interno (somente atendentes)
              </Label>
            </div>
          ) : (
            <span />
          )}
          <Button
            onClick={() => adicionar.mutate()}
            disabled={!conteudo.trim() || adicionar.isPending}
          >
            {adicionar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
