import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Download, Trash2, FileIcon, ImageIcon, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeletorAnexos } from "./SeletorAnexos";
import { obterUsuarioAtual, obterUsuarioAtualId } from "@/auth/atual";
import { storage } from "@/storage/atual";

interface Props {
  chamadoId: string;
  workspaceId: string;
  podeExcluirTodos?: boolean;
}

interface AnexoRegistro {
  id: string;
  nome_arquivo: string;
  caminho_storage: string;
  tipo_mime: string | null;
  tamanho_bytes: number;
  enviado_por: string;
  criado_em: string;
}

const MIME_IMAGEM = /^image\//;

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function gerarUrlAssinada(caminho: string, expiraSegundos = 3600) {
  const { data, error } = await supabase.storage
    .from("chamado-anexos")
    .createSignedUrl(caminho, expiraSegundos);
  if (error) throw error;
  return data.signedUrl;
}

export function AnexosChamado({ chamadoId, workspaceId, podeExcluirTodos = false }: Props) {
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [novos, setNovos] = useState<File[]>([]);
  const [previa, setPrevia] = useState<{ url: string; nome: string } | null>(null);

  const lista = useQuery({
    queryKey: ["anexos", chamadoId],
    queryFn: async (): Promise<AnexoRegistro[]> => {
      const { data, error } = await supabase
        .from("chamado_anexos")
        .select("id, nome_arquivo, caminho_storage, tipo_mime, tamanho_bytes, enviado_por, criado_em")
        .eq("chamado_id", chamadoId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // URLs assinadas para todas as imagens, para exibir prévias na lista
  const previas = useQuery({
    queryKey: ["anexos-previas", chamadoId, lista.data?.map((a) => a.id).join(",")],
    enabled: !!lista.data && lista.data.some((a) => MIME_IMAGEM.test(a.tipo_mime ?? "")),
    queryFn: async () => {
      const map: Record<string, string> = {};
      const imagens = (lista.data ?? []).filter((a) => MIME_IMAGEM.test(a.tipo_mime ?? ""));
      await Promise.all(
        imagens.map(async (a) => {
          try {
            map[a.id] = await gerarUrlAssinada(a.caminho_storage);
          } catch {
            // ignora falhas pontuais
          }
        }),
      );
      return map;
    },
  });

  const enviar = useMutation({
    mutationFn: async (arquivos: File[]) => {
      if (arquivos.length === 0) return;
      setEnviando(true);
      const u = { user: await obterUsuarioAtual() };
      if (!u.user) throw new Error("Sessão expirada");
      const falhas: string[] = [];
      for (const arquivo of arquivos) {
        const nomeSeguro = arquivo.name.replace(/[^\w.\-]+/g, "_");
        const caminho = `${workspaceId}/${chamadoId}/${crypto.randomUUID()}-${nomeSeguro}`;
        const up = await supabase.storage
          .from("chamado-anexos")
          .upload(caminho, arquivo, { contentType: arquivo.type || undefined });
        if (up.error) {
          falhas.push(arquivo.name);
          continue;
        }
        const ins = await supabase.from("chamado_anexos").insert({
          workspace_id: workspaceId,
          chamado_id: chamadoId,
          enviado_por: u.user.id,
          nome_arquivo: arquivo.name,
          caminho_storage: caminho,
          tipo_mime: arquivo.type || null,
          tamanho_bytes: arquivo.size,
        });
        if (ins.error) falhas.push(arquivo.name);
      }
      if (falhas.length > 0) {
        throw new Error(`Falha ao enviar: ${falhas.join(", ")}`);
      }
    },
    onSuccess: () => {
      toast.success("Anexos enviados.");
      setNovos([]);
      queryClient.invalidateQueries({ queryKey: ["anexos", chamadoId] });
    },
    onError: (e: Error) => toast.error("Erro ao enviar anexos.", { description: e.message }),
    onSettled: () => setEnviando(false),
  });

  const excluir = useMutation({
    mutationFn: async (anexo: AnexoRegistro) => {
      await storage.from("chamado-anexos").remove([anexo.caminho_storage]);
      const { error } = await supabase.from("chamado_anexos").delete().eq("id", anexo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anexo removido.");
      queryClient.invalidateQueries({ queryKey: ["anexos", chamadoId] });
    },
    onError: (e: Error) => toast.error("Falha ao remover.", { description: e.message }),
  });

  async function abrir(anexo: AnexoRegistro) {
    try {
      const url = await gerarUrlAssinada(anexo.caminho_storage);
      if (MIME_IMAGEM.test(anexo.tipo_mime ?? "")) {
        setPrevia({ url, nome: anexo.nome_arquivo });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      toast.error("Não foi possível abrir o arquivo.", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function baixar(anexo: AnexoRegistro) {
    try {
      const { data, error } = await supabase.storage
        .from("chamado-anexos")
        .download(anexo.caminho_storage);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = anexo.nome_arquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Falha ao baixar.", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  const itens = lista.data ?? [];
  const usuarioAtual = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => await obterUsuarioAtualId(),
    staleTime: 5 * 60 * 1000,
  });
  const usuarioId = usuarioAtual.data;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SeletorAnexos arquivos={novos} aoMudar={setNovos} desabilitado={enviando} />
        {novos.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={() => enviar.mutate(novos)} disabled={enviando}>
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Enviar {novos.length} arquivo(s)
            </Button>
          </div>
        )}
      </div>

      {lista.isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum anexo neste chamado.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {itens.map((a) => {
            const ehImagem = MIME_IMAGEM.test(a.tipo_mime ?? "");
            const previaUrl = previas.data?.[a.id];
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
              >
                <button
                  type="button"
                  onClick={() => abrir(a)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground transition hover:opacity-80"
                  aria-label={`Abrir ${a.nome_arquivo}`}
                >
                  {ehImagem && previaUrl ? (
                    <img src={previaUrl} alt={a.nome_arquivo} className="h-full w-full object-cover" />
                  ) : ehImagem ? (
                    <ImageIcon className="h-5 w-5" />
                  ) : (
                    <FileIcon className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => abrir(a)}
                    className="block w-full truncate text-left text-sm font-medium hover:underline"
                  >
                    {a.nome_arquivo}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {formatarTamanho(a.tamanho_bytes)} ·{" "}
                    {format(new Date(a.criado_em), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => abrir(a)}
                    aria-label="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => baixar(a)}
                    aria-label="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {(podeExcluirTodos || usuarioId === a.enviado_por) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remover "${a.nome_arquivo}"?`)) {
                          excluir.mutate(a);
                        }
                      }}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!previa} onOpenChange={(aberto) => !aberto && setPrevia(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previa?.nome}</DialogTitle>
          </DialogHeader>
          {previa && (
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto">
              <img src={previa.url} alt={previa.nome} className="max-h-[70vh] w-auto" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
