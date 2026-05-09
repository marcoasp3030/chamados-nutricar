import { useState } from "react";
import { Sparkles, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  workspaceId: string;
  chamadoId: string;
}

type Acao = "resumir" | "sugerir_resposta";

const ROTULOS: Record<Acao, string> = {
  resumir: "Resumir chamado",
  sugerir_resposta: "Sugerir resposta",
};

export function AcoesIAChamado({ workspaceId, chamadoId }: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState<Acao | null>(null);
  const [resultado, setResultado] = useState<string>("");
  const [titulo, setTitulo] = useState<string>("");

  async function executar(acao: Acao) {
    setCarregando(acao);
    setTitulo(ROTULOS[acao]);
    setResultado("");
    setAberto(true);
    try {
      const { data, error } = await supabase.functions.invoke("ia-chamado", {
        body: { workspace_id: workspaceId, chamado_id: chamadoId, acao },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setResultado((data as { resultado: string }).resultado || "(resposta vazia)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setResultado(`❌ ${msg}`);
      toast.error("Falha na IA", { description: msg });
    } finally {
      setCarregando(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={!!carregando}>
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            IA
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => executar("resumir")}>
            Resumir chamado
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => executar("sugerir_resposta")}>
            Sugerir resposta ao solicitante
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> {titulo}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-[160px] whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-sm">
            {carregando ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando com IA...
              </div>
            ) : (
              resultado || "—"
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(resultado);
                toast.success("Copiado.");
              }}
              disabled={!resultado || !!carregando}
            >
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button onClick={() => setAberto(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
