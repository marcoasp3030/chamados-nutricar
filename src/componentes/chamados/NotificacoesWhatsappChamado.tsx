import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  chamadoId: string;
}

interface RegistroNotificacao {
  id: string;
  evento: string;
  destinatario_perfil_id: string;
  telefone: string;
  mensagem: string | null;
  sucesso: boolean;
  status_http: number | null;
  erro: string | null;
  dedup_key: string;
  criado_em: string;
}

interface Perfil {
  id: string;
  nome: string;
  email: string;
}

function rotuloEvento(evento: string): string {
  const map: Record<string, string> = {
    criado: "Chamado criado",
    status: "Status alterado",
    responsavel: "Responsável alterado",
    prioridade: "Prioridade alterada",
    departamento: "Departamento alterado",
    comentario: "Novo comentário",
    resolvido: "Resolvido",
    pausado: "Pausado",
    agendado: "Agendado",
    fechado: "Fechado",
    cancelado: "Cancelado",
  };
  return map[evento] ?? evento;
}

function explicarErro(status: number | null, erro: string | null): string {
  if (!erro && status == null) return "Sem detalhes";
  const ehHtml = !!erro && /<!doctype html|<html/i.test(erro);
  // Uazapi costuma retornar 405 quando o número está fora do formato
  if (status === 405 || /"code"\s*:\s*405|method not allowed/i.test(erro ?? "")) {
    return "Servidor Uazapi rejeitou (405). Causa mais provável: número de telefone em formato inválido. Confirme se o telefone do destinatário tem DDI 55, DDD e o 9 do celular (ex.: 5511987654321).";
  }
  if (status === 404) {
    if (ehHtml) {
      return "Endpoint /api/public/whatsapp-notify retornou 404 (HTML). A rota não existe no deploy chamado pela URL configurada — publique o app ou aponte a URL para o ambiente correto.";
    }
    return "Recurso 404 no servidor Uazapi. Verifique se o caminho de envio está correto para a versão da API.";
  }
  if (status === 401 || status === 403) {
    return "Não autorizado. Verifique o segredo do webhook (Bearer) ou o token da instância Uazapi.";
  }
  if (status === 0 || status == null) {
    return erro || "Sem resposta do servidor (timeout ou rede).";
  }
  if (status >= 500) {
    return `Erro ${status} no servidor de destino: ${erro ?? "sem detalhes"}`;
  }
  return erro ?? `HTTP ${status}`;
}

export function NotificacoesWhatsappChamado({ chamadoId }: Props) {
  const consulta = useQuery({
    queryKey: ["whatsapp-notif-chamado", chamadoId],
    queryFn: async (): Promise<{ registros: RegistroNotificacao[]; perfis: Map<string, Perfil> }> => {
      const { data, error } = await supabase
        .from("chamado_whatsapp_notificacoes")
        .select("id,evento,destinatario_perfil_id,telefone,mensagem,sucesso,status_http,erro,dedup_key,criado_em")
        .eq("chamado_id", chamadoId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      const registros = (data ?? []) as RegistroNotificacao[];
      const ids = Array.from(new Set(registros.map((r) => r.destinatario_perfil_id)));
      const perfis = new Map<string, Perfil>();
      if (ids.length > 0) {
        const { data: ps } = await supabase.from("perfis").select("id,nome,email").in("id", ids);
        for (const p of ps ?? []) perfis.set(p.id, p as Perfil);
      }
      return { registros, perfis };
    },
  });

  if (consulta.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando notificações…
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Falha ao carregar logs. Apenas administradores podem visualizar este painel.
      </div>
    );
  }

  const { registros, perfis } = consulta.data ?? { registros: [], perfis: new Map() };
  const total = registros.length;
  const sucessos = registros.filter((r) => r.sucesso).length;
  const falhas = total - sucessos;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Notificações WhatsApp deste chamado</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {sucessos} ok
          </Badge>
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3 text-destructive" /> {falhas} falha{falhas === 1 ? "" : "s"}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => consulta.refetch()}
            disabled={consulta.isFetching}
          >
            {consulta.isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma notificação registrada para este chamado.
        </div>
      ) : (
        <ul className="space-y-2">
          {registros.map((r) => {
            const perfil = perfis.get(r.destinatario_perfil_id);
            const causa = r.sucesso ? null : explicarErro(r.status_http, r.erro);
            return (
              <li
                key={r.id}
                className={`rounded-lg border p-3 text-sm ${
                  r.sucesso ? "border-border bg-card" : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {r.sucesso ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium">{rotuloEvento(r.evento)}</span>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        HTTP {r.status_http ?? "—"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Para{" "}
                      <span className="font-medium text-foreground">
                        {perfil?.nome ?? "Perfil removido"}
                      </span>{" "}
                      • <span className="font-mono">{r.telefone}</span>
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {format(new Date(r.criado_em), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </time>
                </div>

                {causa && (
                  <div className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    <strong className="font-semibold">Causa:</strong> {causa}
                  </div>
                )}

                {r.mensagem && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Ver mensagem enviada
                    </summary>
                    <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                      {r.mensagem}
                    </pre>
                  </details>
                )}

                {!r.sucesso && r.erro && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Ver resposta bruta do servidor
                    </summary>
                    <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-[11px] font-mono">
                      {r.erro}
                    </pre>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
