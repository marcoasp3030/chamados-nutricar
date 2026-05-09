import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, CreditCard, Eye, EyeOff, Trash2, PlugZap, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { testarVMPay } from "@/lib/vmpay.functions";

interface ConfigVMPay {
  workspace_id: string;
  api_key: string | null;
  ativo: boolean;
}

export function AbaVMPay() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const podeAdmin =
    workspaceAtual && ["Proprietario", "Administrador"].includes(workspaceAtual.papel);

  const { data: config, isLoading } = useQuery({
    queryKey: ["vmpay-config", workspaceAtual?.id],
    enabled: !!workspaceAtual?.id && !!podeAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_vmpay_config")
        .select("*")
        .eq("workspace_id", workspaceAtual!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ConfigVMPay | null;
    },
  });

  const [chave, setChave] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    setChave("");
    setAtivo(config?.ativo ?? false);
  }, [config]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!workspaceAtual) throw new Error("Workspace inválido.");
      const { data: u } = await supabase.auth.getUser();
      if (!config && !chave.trim()) {
        throw new Error("Informe a chave da API VMPay.");
      }
      const payload = {
        workspace_id: workspaceAtual.id,
        ativo,
        atualizado_por: u.user?.id ?? null,
        ...(chave.trim() ? { api_key: chave.trim() } : {}),
      };
      const { error } = await supabase
        .from("workspace_vmpay_config")
        .upsert(payload, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração VMPay salva.");
      setChave("");
      queryClient.invalidateQueries({ queryKey: ["vmpay-config", workspaceAtual?.id] });
    },
    onError: (e: Error) => toast.error("Falha ao salvar.", { description: e.message }),
  });

  const remover = useMutation({
    mutationFn: async () => {
      if (!workspaceAtual) return;
      const { error } = await supabase
        .from("workspace_vmpay_config")
        .delete()
        .eq("workspace_id", workspaceAtual.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chave VMPay removida.");
      queryClient.invalidateQueries({ queryKey: ["vmpay-config", workspaceAtual?.id] });
    },
    onError: (e: Error) => toast.error("Falha ao remover.", { description: e.message }),
  });

  if (!podeAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Apenas Proprietários e Administradores podem configurar a VMPay.
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

  const temChaveSalva = !!config?.api_key;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-5">
        <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Integração VMPay</p>
          <p className="mt-1">
            Cadastre a chave da API VMPay desta empresa para habilitar pagamentos e
            consultas de transações. A chave é armazenada de forma isolada por workspace.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="vmpay-chave">
            Chave da API VMPay{" "}
            {temChaveSalva && (
              <span className="text-xs text-muted-foreground">
                (uma chave já está salva — preencha apenas para substituir)
              </span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="vmpay-chave"
              type={mostrar ? "text" : "password"}
              autoComplete="off"
              placeholder={temChaveSalva ? "•••••••••••••••• (chave salva)" : "Cole sua chave VMPay"}
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label={mostrar ? "Ocultar" : "Mostrar"}
            >
              {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2">
          <div>
            <Label className="text-sm">Ativar integração</Label>
            <p className="text-xs text-muted-foreground">
              Habilita o uso da VMPay neste workspace.
            </p>
          </div>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            {temChaveSalva && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm("Remover a chave VMPay desta empresa?")) remover.mutate();
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
