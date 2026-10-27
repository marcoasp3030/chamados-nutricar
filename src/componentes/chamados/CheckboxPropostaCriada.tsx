import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { db } from "@/dados/atual";
import { cn } from "@/lib/utils";

interface Props {
  chamadoId: string;
  workspaceId: string;
  marcado: boolean;
  podeEditar?: boolean;
  compacto?: boolean;
  className?: string;
}

export function CheckboxPropostaCriada({
  chamadoId,
  workspaceId,
  marcado,
  podeEditar = true,
  compacto = false,
  className,
}: Props) {
  const queryClient = useQueryClient();

  const atualizar = useMutation({
    mutationFn: async (valor: boolean) => {
      const { error } = await db
        .from("chamados")
        .update({ proposta_criada: valor })
        .eq("id", chamadoId);
      if (error) throw error;
    },
    onSuccess: (_v, valor) => {
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
      queryClient.invalidateQueries({ queryKey: ["chamado", workspaceId] });
      toast.success(valor ? "Marcado: proposta criada." : "Proposta criada desmarcada.");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível atualizar.", { description: e.message }),
  });

  if (!podeEditar) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
          marcado
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            : "bg-muted text-muted-foreground",
          className,
        )}
      >
        {marcado ? "Proposta criada" : "Sem proposta"}
      </span>
    );
  }

  const conteudo = (
    <>
      {atualizar.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Checkbox
          id={`proposta-${chamadoId}`}
          checked={marcado}
          onCheckedChange={(v) => atualizar.mutate(!!v)}
          disabled={atualizar.isPending}
        />
      )}
      <Label
        htmlFor={`proposta-${chamadoId}`}
        className={cn(
          "cursor-pointer font-normal",
          compacto ? "text-xs" : "text-sm",
        )}
      >
        Proposta criada
      </Label>
    </>
  );

  if (compacto) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>{conteudo}</div>
    );
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 p-3",
        className,
      )}
    >
      {conteudo}
    </label>
  );
}
