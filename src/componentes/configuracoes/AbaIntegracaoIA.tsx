import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Sparkles, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { obterUsuarioAtual } from "@/auth/atual";

const MODELOS = [
  { valor: "gpt-5-mini", rotulo: "GPT-5 mini (rápido e barato)" },
  { valor: "gpt-5", rotulo: "GPT-5 (mais preciso)" },
  { valor: "gpt-5-nano", rotulo: "GPT-5 nano (ultrarrápido)" },
  { valor: "gpt-4o-mini", rotulo: "GPT-4o mini" },
  { valor: "gpt-4o", rotulo: "GPT-4o" },
];

interface ConfigIA {
  workspace_id: string;
  openai_api_key: string | null;
  modelo: string;
  ativo: boolean;
}

export function AbaIntegracaoIA() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const podeAdmin =
    workspaceAtual && ["Proprietario", "Administrador"].includes(workspaceAtual.papel);

  const { data: config, isLoading } = useQuery({
    queryKey: ["ia-config", workspaceAtual?.id],
    enabled: !!workspaceAtual?.id && !!podeAdmin,
    queryFn: async () => {
      const { data, error } = await dados
        .from("workspace_ia_config")
        .select("*")
        .eq("workspace_id", workspaceAtual!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ConfigIA | null;
    },
  });

  const [chave, setChave] = useState("");
  const [modelo, setModelo] = useState("gpt-5-mini");
  const [ativo, setAtivo] = useState(false);
  const [mostrarChave, setMostrarChave] = useState(false);

  useEffect(() => {
    if (config) {
      setChave(""); // nunca pré-preencher por segurança
      setModelo(config.modelo || "gpt-5-mini");
      setAtivo(config.ativo);
    } else {
      setChave("");
      setModelo("gpt-5-mini");
      setAtivo(false);
    }
  }, [config]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!workspaceAtual) throw new Error("Workspace inválido.");
      const u = { user: await obterUsuarioAtual() };

      if (!config && !chave.trim()) {
        throw new Error("Informe a chave OpenAI para ativar a IA.");
      }

      const payload = {
        workspace_id: workspaceAtual.id,
        modelo,
        ativo,
        atualizado_por: u.user?.id ?? null,
        ...(chave.trim() ? { openai_api_key: chave.trim() } : {}),
      };

      const { error } = await dados
        .from("workspace_ia_config")
        .upsert(payload, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração de IA salva.");
      setChave("");
      queryClient.invalidateQueries({ queryKey: ["ia-config", workspaceAtual?.id] });
    },
    onError: (e: Error) => toast.error("Falha ao salvar.", { description: e.message }),
  });

  const remover = useMutation({
    mutationFn: async () => {
      if (!workspaceAtual) return;
      const { error } = await dados
        .from("workspace_ia_config")
        .delete()
        .eq("workspace_id", workspaceAtual.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chave removida.");
      queryClient.invalidateQueries({ queryKey: ["ia-config", workspaceAtual?.id] });
    },
    onError: (e: Error) => toast.error("Falha ao remover.", { description: e.message }),
  });

  if (!podeAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Apenas Proprietários e Administradores podem configurar a integração de IA.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const temChaveSalva = !!config?.openai_api_key;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-5">
        <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Inteligência artificial nos chamados</p>
          <p className="mt-1">
            Cadastre uma chave da OpenAI para liberar resumos automáticos, sugestões de resposta e
            classificação de prioridade nos chamados desta empresa. Sua chave é armazenada de forma
            isolada por workspace e nunca é exposta ao navegador.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="chave">
            Chave da API OpenAI {temChaveSalva && <span className="text-xs text-muted-foreground">(uma chave já está salva — preencha apenas para substituir)</span>}
          </Label>
          <div className="relative">
            <Input
              id="chave"
              type={mostrarChave ? "text" : "password"}
              autoComplete="off"
              placeholder={temChaveSalva ? "•••••••••••••••• (chave salva)" : "sk-..."}
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setMostrarChave((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label={mostrarChave ? "Ocultar chave" : "Mostrar chave"}
            >
              {mostrarChave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtenha em{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              platform.openai.com/api-keys
            </a>
            .
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Modelo padrão</Label>
            <Select value={modelo} onValueChange={setModelo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELOS.map((m) => (
                  <SelectItem key={m.valor} value={m.valor}>
                    {m.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <div className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2">
              <div>
                <Label className="text-sm">Ativar IA</Label>
                <p className="text-xs text-muted-foreground">Habilita os botões de IA nos chamados.</p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            {temChaveSalva && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm("Remover a chave OpenAI desta empresa?")) remover.mutate();
                }}
                disabled={remover.isPending}
              >
                <Trash2 className="h-4 w-4" /> Remover chave
              </Button>
            )}
          </div>
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
            {salvar.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar configurações
          </Button>
        </div>
      </div>
    </div>
  );
}
