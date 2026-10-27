import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileIcon,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeletorAnexos } from "@/componentes/chamados/SeletorAnexos";
import { obterUsuarioAtual, obterUsuarioAtualId } from "@/auth/atual";
import { storage } from "@/storage/atual";
import { db } from "@/dados/atual";

const BUCKET = "checklist-anexos";
const MIME_IMAGEM = /^image\//;

interface Props {
  checklistId: string;
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

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function gerarUrlAssinada(caminho: string, expiraSegundos = 3600) {
  const { data, error } = await storage
    .from(BUCKET)
    .createSignedUrl(caminho, expiraSegundos);
  if (error || !data) throw error ?? new Error("Sem dados");
  return data.signedUrl;
}

export function GaleriaAnexosChecklist({
  checklistId,
  workspaceId,
  podeExcluirTodos = false,
}: Props) {
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [novos, setNovos] = useState<File[]>([]);
  // Índice da imagem aberta no visualizador (lightbox); null = fechado.
  const [aberto, setAberto] = useState<number | null>(null);

  const lista = useQuery({
    queryKey: ["checklist-anexos", checklistId],
    queryFn: async (): Promise<AnexoRegistro[]> => {
      const { data, error } = await db
        .from("checklist_anexos")
        .select(
          "id, nome_arquivo, caminho_storage, tipo_mime, tamanho_bytes, enviado_por, criado_em",
        )
        .eq("checklist_id", checklistId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const itens = lista.data ?? [];
  const imagens = itens.filter((a) => MIME_IMAGEM.test(a.tipo_mime ?? ""));
  const outros = itens.filter((a) => !MIME_IMAGEM.test(a.tipo_mime ?? ""));

  // URLs assinadas para exibir as miniaturas das imagens.
  const previas = useQuery({
    queryKey: ["checklist-anexos-previas", checklistId, imagens.map((a) => a.id).join(",")],
    enabled: imagens.length > 0,
    queryFn: async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        imagens.map(async (a) => {
          try {
            map[a.id] = await gerarUrlAssinada(a.caminho_storage);
          } catch {
            // ignora falhas pontuais de uma miniatura
          }
        }),
      );
      return map;
    },
  });

  const usuarioAtual = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => await obterUsuarioAtualId(),
    staleTime: 5 * 60 * 1000,
  });
  const usuarioId = usuarioAtual.data;

  const enviar = useMutation({
    mutationFn: async (arquivos: File[]) => {
      if (arquivos.length === 0) return;
      setEnviando(true);
      const u = await obterUsuarioAtual();
      if (!u) throw new Error("Sessão expirada");
      const falhas: string[] = [];
      for (const arquivo of arquivos) {
        const nomeSeguro = arquivo.name.replace(/[^\w.\-]+/g, "_");
        const caminho = `${workspaceId}/${checklistId}/${crypto.randomUUID()}-${nomeSeguro}`;
        const up = await storage
          .from(BUCKET)
          .upload(caminho, arquivo, { contentType: arquivo.type || undefined });
        if (up.error) {
          falhas.push(arquivo.name);
          continue;
        }
        const ins = await db.from("checklist_anexos").insert({
          workspace_id: workspaceId,
          checklist_id: checklistId,
          enviado_por: u.id,
          nome_arquivo: arquivo.name,
          caminho_storage: caminho,
          tipo_mime: arquivo.type || null,
          tamanho_bytes: arquivo.size,
        });
        if (ins.error) falhas.push(arquivo.name);
      }
      if (falhas.length > 0) throw new Error(`Falha ao enviar: ${falhas.join(", ")}`);
    },
    onSuccess: () => {
      toast.success("Imagens enviadas.");
      setNovos([]);
      queryClient.invalidateQueries({ queryKey: ["checklist-anexos", checklistId] });
    },
    onError: (e: Error) => toast.error("Erro ao enviar.", { description: e.message }),
    onSettled: () => setEnviando(false),
  });

  const excluir = useMutation({
    mutationFn: async (anexo: AnexoRegistro) => {
      await storage.from(BUCKET).remove([anexo.caminho_storage]);
      const { error } = await db.from("checklist_anexos").delete().eq("id", anexo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anexo removido.");
      setAberto(null);
      queryClient.invalidateQueries({ queryKey: ["checklist-anexos", checklistId] });
    },
    onError: (e: Error) => toast.error("Falha ao remover.", { description: e.message }),
  });

  async function baixar(anexo: AnexoRegistro) {
    try {
      const { data, error } = await storage.from(BUCKET).download(anexo.caminho_storage);
      if (error || !data) throw error ?? new Error("Sem dados");
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

  async function abrirOutro(anexo: AnexoRegistro) {
    try {
      const url = await gerarUrlAssinada(anexo.caminho_storage);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Não foi possível abrir o arquivo.", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  const imagemAtual = aberto !== null ? imagens[aberto] : null;
  function navegar(dir: -1 | 1) {
    if (aberto === null || imagens.length === 0) return;
    setAberto((i) => {
      const atual = i ?? 0;
      return (atual + dir + imagens.length) % imagens.length;
    });
  }

  function podeRemover(a: AnexoRegistro) {
    return podeExcluirTodos || usuarioId === a.enviado_por;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SeletorAnexos
          arquivos={novos}
          aoMudar={setNovos}
          desabilitado={enviando}
          aceitar="image/*"
          tamanhoMaxMb={25}
        />
        {novos.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={() => enviar.mutate(novos)} disabled={enviando}>
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Enviar {novos.length} imagem(ns)
            </Button>
          </div>
        )}
      </div>

      {lista.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : imagens.length === 0 && outros.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma imagem anexada ainda.
          </p>
        </div>
      ) : (
        <>
          {imagens.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {imagens.map((a, idx) => {
                const previaUrl = previas.data?.[a.id];
                return (
                  <div
                    key={a.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                  >
                    <button
                      type="button"
                      onClick={() => setAberto(idx)}
                      className="h-full w-full"
                      aria-label={`Abrir ${a.nome_arquivo}`}
                    >
                      {previaUrl ? (
                        <img
                          src={previaUrl}
                          alt={a.nome_arquivo}
                          loading="lazy"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </button>

                    {/* Overlay com ações e nome no hover */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/10 opacity-0 transition group-hover:opacity-100">
                      <div className="pointer-events-auto flex justify-end gap-1 p-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => baixar(a)}
                          aria-label="Baixar"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {podeRemover(a) && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Remover "${a.nome_arquivo}"?`)) excluir.mutate(a);
                            }}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="truncate px-2 pb-1.5 text-left text-xs font-medium text-white">
                        {a.nome_arquivo}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Arquivos que não são imagem (fallback) */}
          {outros.length > 0 && (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {outros.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => abrirOutro(a)}
                      className="block w-full truncate text-left text-sm font-medium hover:underline"
                    >
                      {a.nome_arquivo}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {formatarTamanho(a.tamanho_bytes)} ·{" "}
                      {format(new Date(a.criado_em), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
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
                  {podeRemover(a) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remover "${a.nome_arquivo}"?`)) excluir.mutate(a);
                      }}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Visualizador (lightbox) com navegação entre imagens */}
      <Dialog open={aberto !== null} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {imagemAtual?.nome_arquivo}
              {imagens.length > 1 && aberto !== null && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {aberto + 1} de {imagens.length}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {imagemAtual && (
            <div className="relative flex max-h-[75vh] items-center justify-center overflow-auto">
              <img
                src={previas.data?.[imagemAtual.id]}
                alt={imagemAtual.nome_arquivo}
                className="max-h-[70vh] w-auto rounded-lg"
              />
              {imagens.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                    onClick={() => navegar(-1)}
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                    onClick={() => navegar(1)}
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          )}
          {imagemAtual && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-muted-foreground">
                {formatarTamanho(imagemAtual.tamanho_bytes)} ·{" "}
                {format(new Date(imagemAtual.criado_em), "dd 'de' MMM yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => baixar(imagemAtual)}>
                  <Download className="h-4 w-4" /> Baixar
                </Button>
                {podeRemover(imagemAtual) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remover "${imagemAtual.nome_arquivo}"?`))
                        excluir.mutate(imagemAtual);
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Remover
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
