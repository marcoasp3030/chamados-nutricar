import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  MessageCircle,
  Eye,
  EyeOff,
  Save,
  QrCode,
  Power,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Smartphone,
  Plug,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import {
  salvarUazapiConfig,
  criarInstanciaUazapi,
  obterStatusUazapi,
  reconectarUazapi,
  desconectarUazapi,
  excluirInstanciaUazapi,
} from "@/lib/uazapi.functions";

interface ConfigRow {
  workspace_id: string;
  server_url: string | null;
  instance_name: string | null;
  status: string;
  qr_code: string | null;
  numero_conectado: string | null;
  conectado_em: string | null;
  ultima_sincronizacao: string | null;
}

interface LogRow {
  id: string;
  acao: string;
  sucesso: boolean;
  status_http: number | null;
  mensagem: string | null;
  criado_em: string;
}

const STATUS_LABEL: Record<string, { label: string; cor: string; Icon: typeof CheckCircle2 }> = {
  connected: { label: "Conectado", cor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 },
  qr: { label: "Aguardando QR Code", cor: "bg-amber-500/15 text-amber-600 border-amber-500/30", Icon: QrCode },
  connecting: { label: "Conectando", cor: "bg-blue-500/15 text-blue-600 border-blue-500/30", Icon: Loader2 },
  disconnected: { label: "Desconectado", cor: "bg-muted text-muted-foreground border-border", Icon: XCircle },
};

function renderQR(qr: string | null) {
  if (!qr) return null;
  const src = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
  return src;
}

export function AbaUazapi() {
  const { workspaceAtual } = useWorkspaceStore();
  const qc = useQueryClient();
  const podeAdmin = workspaceAtual && ["Proprietario", "Administrador"].includes(workspaceAtual.papel);

  const salvar = useServerFn(salvarUazapiConfig);
  const criar = useServerFn(criarInstanciaUazapi);
  const status = useServerFn(obterStatusUazapi);
  const reconectar = useServerFn(reconectarUazapi);
  const desconectar = useServerFn(desconectarUazapi);
  const excluir = useServerFn(excluirInstanciaUazapi);

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["uazapi-config", workspaceAtual?.id],
    enabled: !!workspaceAtual?.id && !!podeAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_uazapi_config")
        .select("workspace_id,server_url,instance_name,status,qr_code,numero_conectado,conectado_em,ultima_sincronizacao")
        .eq("workspace_id", workspaceAtual!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ConfigRow | null;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["uazapi-logs", workspaceAtual?.id],
    enabled: !!workspaceAtual?.id && !!podeAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_uazapi_logs")
        .select("id,acao,sucesso,status_http,mensagem,criado_em")
        .eq("workspace_id", workspaceAtual!.id)
        .order("criado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as LogRow[];
    },
    refetchInterval: 8000,
  });

  // Polling de status — rápido enquanto aguardando, lento quando conectado
  const intervalo =
    cfg?.status === "connected" ? 30000 : cfg?.instance_name ? 4000 : false;

  useQuery({
    queryKey: ["uazapi-status", workspaceAtual?.id],
    enabled: !!workspaceAtual?.id && !!podeAdmin && !!cfg?.instance_name,
    refetchInterval: intervalo,
    queryFn: async () => {
      await status({ data: { workspaceId: workspaceAtual!.id } });
      qc.invalidateQueries({ queryKey: ["uazapi-config", workspaceAtual!.id] });
      return true;
    },
  });

  const [serverUrl, setServerUrl] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    setServerUrl(cfg?.server_url ?? "");
    setAdminToken("");
  }, [cfg?.server_url]);

  const mSalvar = useMutation({
    mutationFn: async () => {
      await salvar({
        data: { workspaceId: workspaceAtual!.id, serverUrl, adminToken: adminToken || "__manter__" },
      });
    },
    onSuccess: () => {
      toast.success("Conexão validada e salva.");
      setAdminToken("");
      qc.invalidateQueries({ queryKey: ["uazapi-config"] });
      qc.invalidateQueries({ queryKey: ["uazapi-logs"] });
    },
    onError: (e: Error) => toast.error("Falha ao salvar", { description: e.message }),
  });

  const mCriar = useMutation({
    mutationFn: async () => {
      await criar({ data: { workspaceId: workspaceAtual!.id } });
    },
    onSuccess: () => {
      toast.success("Instância criada. Aguardando QR Code...");
      qc.invalidateQueries({ queryKey: ["uazapi-config"] });
    },
    onError: (e: Error) => toast.error("Falha ao criar instância", { description: e.message }),
  });

  const mReconectar = useMutation({
    mutationFn: async () => {
      await reconectar({ data: { workspaceId: workspaceAtual!.id } });
    },
    onSuccess: () => {
      toast.success("Reconexão solicitada.");
      qc.invalidateQueries({ queryKey: ["uazapi-config"] });
    },
    onError: (e: Error) => toast.error("Falha ao reconectar", { description: e.message }),
  });

  const mDesconectar = useMutation({
    mutationFn: async () => {
      await desconectar({ data: { workspaceId: workspaceAtual!.id } });
    },
    onSuccess: () => {
      toast.success("WhatsApp desconectado.");
      qc.invalidateQueries({ queryKey: ["uazapi-config"] });
    },
    onError: (e: Error) => toast.error("Falha ao desconectar", { description: e.message }),
  });

  const mExcluir = useMutation({
    mutationFn: async () => {
      await excluir({ data: { workspaceId: workspaceAtual!.id } });
    },
    onSuccess: () => {
      toast.success("Instância removida.");
      qc.invalidateQueries({ queryKey: ["uazapi-config"] });
    },
    onError: (e: Error) => toast.error("Falha ao excluir", { description: e.message }),
  });

  if (!podeAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Apenas Proprietários e Administradores podem configurar o WhatsApp.
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

  const statusInfo = STATUS_LABEL[cfg?.status ?? "disconnected"] ?? STATUS_LABEL.disconnected;
  const StatusIcon = statusInfo.Icon;
  const qrSrc = renderQR(cfg?.qr_code ?? null);
  const temConfig = !!cfg?.server_url;
  const temInstancia = !!cfg?.instance_name;
  const conectado = cfg?.status === "connected";

  return (
    <div className="space-y-6">
      {/* Cabeçalho informativo */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-5">
        <MessageCircle className="mt-0.5 h-5 w-5 text-primary" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Integração WhatsApp via Uazapi</p>
          <p className="mt-1">
            Configure o servidor Uazapi e conecte uma instância de WhatsApp para esta empresa.
            Os tokens são armazenados de forma segura e usados apenas em chamadas de servidor.
          </p>
        </div>
      </div>

      {/* Configuração */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-semibold flex items-center gap-2">
          <Plug className="h-4 w-4" /> Credenciais
        </h3>

        <div className="space-y-2">
          <Label htmlFor="uazapi-url">Server URL</Label>
          <Input
            id="uazapi-url"
            placeholder="https://seu-servidor.uazapi.com"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="uazapi-token">
            Admin Token{" "}
            {temConfig && (
              <span className="text-xs text-muted-foreground">(preencha apenas para substituir)</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="uazapi-token"
              type={mostrar ? "text" : "password"}
              autoComplete="off"
              placeholder={temConfig ? "•••••••••••••• (token salvo)" : "Cole o admin token"}
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            >
              {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button
            onClick={() => mSalvar.mutate()}
            disabled={mSalvar.isPending || !serverUrl || (!temConfig && !adminToken)}
          >
            {mSalvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar e validar
          </Button>
        </div>
      </div>

      {/* Painel de instância */}
      {temConfig && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> Instância WhatsApp
            </h3>
            <Badge variant="outline" className={`gap-1.5 ${statusInfo.cor}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${cfg?.status === "connecting" ? "animate-spin" : ""}`} />
              {statusInfo.label}
            </Badge>
          </div>

          {!temInstancia ? (
            <div className="text-center py-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Nenhuma instância criada ainda. Clique abaixo para iniciar.
              </p>
              <Button onClick={() => mCriar.mutate()} disabled={mCriar.isPending}>
                {mCriar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Criar instância
              </Button>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Nome da instância</dt>
                  <dd className="font-mono">{cfg?.instance_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Número conectado</dt>
                  <dd className="font-mono">{cfg?.numero_conectado ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Conectado em</dt>
                  <dd>{cfg?.conectado_em ? new Date(cfg.conectado_em).toLocaleString("pt-BR") : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Última sincronização</dt>
                  <dd>
                    {cfg?.ultima_sincronizacao
                      ? new Date(cfg.ultima_sincronizacao).toLocaleString("pt-BR")
                      : "—"}
                  </dd>
                </div>
              </dl>

              {/* QR Code */}
              {!conectado && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-6">
                  {qrSrc ? (
                    <>
                      <img
                        src={qrSrc}
                        alt="QR Code WhatsApp"
                        className="h-64 w-64 rounded-lg bg-white p-2"
                      />
                      <p className="text-xs text-muted-foreground text-center max-w-sm">
                        Abra o WhatsApp no celular → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> e escaneie o código.
                        O QR é atualizado automaticamente.
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Gerando QR Code...</p>
                    </div>
                  )}
                </div>
              )}

              {conectado && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  WhatsApp conectado e operacional.
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  onClick={() => mReconectar.mutate()}
                  disabled={mReconectar.isPending}
                >
                  {mReconectar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Reconectar
                </Button>
                {conectado && (
                  <Button
                    variant="outline"
                    onClick={() => mDesconectar.mutate()}
                    disabled={mDesconectar.isPending}
                  >
                    {mDesconectar.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                    Desconectar
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive ml-auto"
                  onClick={() => {
                    if (confirm("Excluir a instância? Você precisará criar uma nova depois.")) mExcluir.mutate();
                  }}
                  disabled={mExcluir.isPending}
                >
                  <Trash2 className="h-4 w-4" /> Excluir instância
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Logs */}
      {temConfig && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Logs de integração
          </h3>
          <div className="rounded-lg border border-border divide-y divide-border max-h-80 overflow-auto">
            {!logs?.length ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Nenhum log ainda.</p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 px-4 py-2.5 text-xs">
                  {l.sucesso ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.acao}</span>
                      {l.status_http != null && (
                        <span className="text-muted-foreground">HTTP {l.status_http}</span>
                      )}
                    </div>
                    {l.mensagem && <p className="text-muted-foreground truncate">{l.mensagem}</p>}
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(l.criado_em).toLocaleTimeString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
