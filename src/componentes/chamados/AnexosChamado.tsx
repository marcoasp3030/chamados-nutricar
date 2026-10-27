import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileIcon,
  Film,
  Folder,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeletorAnexos } from "./SeletorAnexos";
import { useDepartamentos } from "@/componentes/configuracoes/AbaDepartamentos";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { obterUsuarioAtual, obterUsuarioAtualId } from "@/auth/atual";
import { storage } from "@/storage/atual";
import { db } from "@/dados/atual";
import { cn } from "@/lib/utils";
import { sinalizarNotificacoesWorkspace } from "@/lib/notificacoes-chamado";

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

interface InfoAutor {
  nome: string;
  email: string;
  departamentos: string[];
}

interface PastaEnvio {
  id: string;
  numero: number;
  autorId: string;
  info: InfoAutor;
  anexos: AnexoRegistro[];
  inicioEm: number;
  ultimoEm: number;
}

type TipoMidia = "imagem" | "video" | "documento";

const MIME_IMAGEM = /^image\//;
const MIME_VIDEO = /^video\//;
/** Arquivos do mesmo autor enviados em sequência dentro desta janela = uma pasta. */
const JANELA_MESMO_ENVIO_MS = 5 * 60 * 1000;

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function tipoMidia(anexo: AnexoRegistro): TipoMidia {
  const mime = anexo.tipo_mime ?? "";
  if (MIME_IMAGEM.test(mime)) return "imagem";
  if (MIME_VIDEO.test(mime)) return "video";
  return "documento";
}

function categorizarAnexos(anexos: AnexoRegistro[]) {
  const imagens: AnexoRegistro[] = [];
  const videos: AnexoRegistro[] = [];
  const documentos: AnexoRegistro[] = [];
  for (const a of anexos) {
    const t = tipoMidia(a);
    if (t === "imagem") imagens.push(a);
    else if (t === "video") videos.push(a);
    else documentos.push(a);
  }
  return { imagens, videos, documentos };
}

async function gerarUrlAssinada(caminho: string, expiraSegundos = 3600) {
  const { data, error } = await storage
    .from("chamado-anexos")
    .createSignedUrl(caminho, expiraSegundos);
  if (error || !data) throw error ?? new Error("Sem dados");
  return data.signedUrl;
}

function construirMapaAutores(
  perfis: Map<string, { nome: string; email: string }>,
  membros: ReturnType<typeof useMembrosWorkspace>["data"],
  departamentos: ReturnType<typeof useDepartamentos>["data"],
): Map<string, InfoAutor> {
  const nomeDep = new Map((departamentos ?? []).map((d) => [d.id, d.nome]));
  const mapa = new Map<string, InfoAutor>();

  for (const m of membros ?? []) {
    const deps = m.departamento_ids
      .map((id) => nomeDep.get(id))
      .filter((n): n is string => !!n);
    mapa.set(m.usuario_id, {
      nome: m.perfil.nome,
      email: m.perfil.email,
      departamentos: deps,
    });
  }

  for (const [id, p] of perfis) {
    if (!mapa.has(id)) {
      mapa.set(id, { nome: p.nome, email: p.email, departamentos: [] });
    }
  }

  return mapa;
}

function agruparEmPastas(
  anexos: AnexoRegistro[],
  mapaAutores: Map<string, InfoAutor>,
): PastaEnvio[] {
  const ordenados = [...anexos].sort(
    (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
  );
  const pastas: PastaEnvio[] = [];

  for (const a of ordenados) {
    const momento = new Date(a.criado_em).getTime();
    const ultima = pastas[pastas.length - 1];
    const mesmoAutor = ultima?.autorId === a.enviado_por;
    const mesmaSessao =
      ultima && mesmoAutor && momento - ultima.ultimoEm <= JANELA_MESMO_ENVIO_MS;

    if (mesmaSessao && ultima) {
      ultima.anexos.push(a);
      ultima.ultimoEm = momento;
    } else {
      pastas.push({
        id: `pasta-${a.enviado_por}-${a.id}`,
        numero: 0,
        autorId: a.enviado_por,
        info: mapaAutores.get(a.enviado_por) ?? {
          nome: "Usuário removido",
          email: "",
          departamentos: [],
        },
        anexos: [a],
        inicioEm: momento,
        ultimoEm: momento,
      });
    }
  }

  pastas.forEach((p, i) => {
    p.numero = i + 1;
  });

  return [...pastas].reverse();
}

function resumoTipos(anexos: AnexoRegistro[]) {
  const { imagens, videos, documentos } = categorizarAnexos(anexos);
  const partes: string[] = [];
  if (imagens.length > 0) {
    partes.push(`${imagens.length} foto${imagens.length > 1 ? "s" : ""}`);
  }
  if (videos.length > 0) {
    partes.push(`${videos.length} vídeo${videos.length > 1 ? "s" : ""}`);
  }
  if (documentos.length > 0) {
    partes.push(`${documentos.length} documento${documentos.length > 1 ? "s" : ""}`);
  }
  return partes.join(" · ");
}

export function AnexosChamado({ chamadoId, workspaceId, podeExcluirTodos = false }: Props) {
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [novos, setNovos] = useState<File[]>([]);
  const [previa, setPrevia] = useState<{
    url: string;
    nome: string;
    tipo: "imagem" | "video";
    indice?: number;
    ids?: string[];
  } | null>(null);
  const [pastasAbertas, setPastasAbertas] = useState<string[]>([]);

  const { data: membros } = useMembrosWorkspace(workspaceId);
  const { data: departamentos } = useDepartamentos(workspaceId);

  const lista = useQuery({
    queryKey: ["anexos", chamadoId],
    queryFn: async (): Promise<AnexoRegistro[]> => {
      const { data, error } = await db
        .from("chamado_anexos")
        .select(
          "id, nome_arquivo, caminho_storage, tipo_mime, tamanho_bytes, enviado_por, criado_em",
        )
        .eq("chamado_id", chamadoId)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const perfisQuery = useQuery({
    queryKey: ["anexos-perfis", chamadoId, lista.data?.map((a) => a.enviado_por).join(",")],
    enabled: !!lista.data && lista.data.length > 0,
    queryFn: async () => {
      const ids = [...new Set((lista.data ?? []).map((a) => a.enviado_por))];
      const { data, error } = await db.from("perfis").select("id, nome, email").in("id", ids);
      if (error) throw error;
      return new Map((data ?? []).map((p) => [p.id, { nome: p.nome, email: p.email }]));
    },
  });

  const mapaAutores = useMemo(
    () => construirMapaAutores(perfisQuery.data ?? new Map(), membros, departamentos),
    [perfisQuery.data, membros, departamentos],
  );

  const pastas = useMemo(
    () => agruparEmPastas(lista.data ?? [], mapaAutores),
    [lista.data, mapaAutores],
  );

  useEffect(() => {
    if (pastas.length === 0) {
      setPastasAbertas([]);
      return;
    }
    setPastasAbertas((atual) => {
      const ids = pastas.map((p) => p.id);
      const validas = atual.filter((id) => ids.includes(id));
      const maisRecente = pastas[0].id;
      if (!validas.includes(maisRecente)) {
        return [...validas, maisRecente];
      }
      if (validas.length > 0) return validas;
      return pastas.length <= 3 ? ids : [maisRecente];
    });
  }, [pastas]);

  const midiasVisuais = useMemo(
    () =>
      (lista.data ?? []).filter((a) => {
        const t = tipoMidia(a);
        return t === "imagem" || t === "video";
      }),
    [lista.data],
  );

  const previas = useQuery({
    queryKey: ["anexos-previas", chamadoId, midiasVisuais.map((a) => a.id).join(",")],
    enabled: midiasVisuais.length > 0,
    queryFn: async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        midiasVisuais.map(async (a) => {
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

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["anexos", chamadoId] });
    queryClient.invalidateQueries({ queryKey: ["chamados-contagem-anexos", workspaceId] });
  };

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
        const up = await storage
          .from("chamado-anexos")
          .upload(caminho, arquivo, { contentType: arquivo.type || undefined });
        if (up.error) {
          falhas.push(arquivo.name);
          continue;
        }
        const ins = await db.from("chamado_anexos").insert({
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
      invalidar();
      void sinalizarNotificacoesWorkspace(workspaceId);
    },
    onError: (e: Error) => toast.error("Erro ao enviar anexos.", { description: e.message }),
    onSettled: () => setEnviando(false),
  });

  const excluir = useMutation({
    mutationFn: async (anexo: AnexoRegistro) => {
      await storage.from("chamado-anexos").remove([anexo.caminho_storage]);
      const { error } = await db.from("chamado_anexos").delete().eq("id", anexo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anexo removido.");
      invalidar();
    },
    onError: (e: Error) => toast.error("Falha ao remover.", { description: e.message }),
  });

  const usuarioAtual = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => await obterUsuarioAtualId(),
    staleTime: 5 * 60 * 1000,
  });
  const usuarioId = usuarioAtual.data;

  const itens = lista.data ?? [];
  const totalAutores = useMemo(
    () => new Set(itens.map((a) => a.enviado_por)).size,
    [itens],
  );

  function podeRemover(anexo: AnexoRegistro) {
    return podeExcluirTodos || usuarioId === anexo.enviado_por;
  }

  async function abrirMidia(anexo: AnexoRegistro, galeria?: AnexoRegistro[]) {
    try {
      const url = await gerarUrlAssinada(anexo.caminho_storage);
      const t = tipoMidia(anexo);
      if (t === "imagem" || t === "video") {
        const visiveis = (galeria ?? [anexo]).filter(
          (a) => tipoMidia(a) === "imagem" || tipoMidia(a) === "video",
        );
        const indice = visiveis.findIndex((a) => a.id === anexo.id);
        setPrevia({
          url,
          nome: anexo.nome_arquivo,
          tipo: t,
          indice: indice >= 0 ? indice : 0,
          ids: visiveis.map((a) => a.id),
        });
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
      const { data, error } = await storage
        .from("chamado-anexos")
        .download(anexo.caminho_storage);
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

  function navegarPrevia(direcao: -1 | 1) {
    if (!previa?.ids || previa.indice === undefined) return;
    const novoIndice = previa.indice + direcao;
    if (novoIndice < 0 || novoIndice >= previa.ids.length) return;
    const proximo = itens.find((a) => a.id === previa.ids![novoIndice]);
    if (!proximo) return;
    void gerarUrlAssinada(proximo.caminho_storage).then((url) => {
      const t = tipoMidia(proximo);
      setPrevia({
        url,
        nome: proximo.nome_arquivo,
        tipo: t === "video" ? "video" : "imagem",
        indice: novoIndice,
        ids: previa.ids,
      });
    });
  }

  function renderCartaoMidia(anexo: AnexoRegistro, galeria: AnexoRegistro[]) {
    const t = tipoMidia(anexo);
    const previaUrl = previas.data?.[anexo.id];
    return (
      <div
        key={anexo.id}
        className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
      >
        <button
          type="button"
          onClick={() => abrirMidia(anexo, galeria)}
          className="h-full w-full"
          aria-label={`Abrir ${anexo.nome_arquivo}`}
        >
          {t === "imagem" && previaUrl ? (
            <img
              src={previaUrl}
              alt={anexo.nome_arquivo}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : t === "video" && previaUrl ? (
            <video
              src={previaUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {t === "video" ? (
                <Film className="h-8 w-8 text-muted-foreground" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          )}
        </button>
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/75 via-transparent to-black/10 opacity-0 transition group-hover:opacity-100">
          <div className="pointer-events-auto flex justify-end gap-1 p-1.5">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => baixar(anexo)}
              aria-label="Baixar"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            {podeRemover(anexo) && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Remover "${anexo.nome_arquivo}"?`)) excluir.mutate(anexo);
                }}
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="px-2 pb-1.5 text-left">
            <p className="truncate text-xs font-medium text-white">{anexo.nome_arquivo}</p>
            <p className="text-[10px] text-white/80">
              {format(new Date(anexo.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderDocumento(anexo: AnexoRegistro) {
    return (
      <li
        key={anexo.id}
        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => abrirMidia(anexo)}
            className="block w-full truncate text-left text-sm font-medium hover:underline"
          >
            {anexo.nome_arquivo}
          </button>
          <p className="text-xs text-muted-foreground">
            {formatarTamanho(anexo.tamanho_bytes)} ·{" "}
            {format(new Date(anexo.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => baixar(anexo)}
            aria-label="Baixar"
          >
            <Download className="h-4 w-4" />
          </Button>
          {podeRemover(anexo) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Remover "${anexo.nome_arquivo}"?`)) excluir.mutate(anexo);
              }}
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Adicionar anexos</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Cada envio forma uma pasta automaticamente, agrupando os arquivos enviados juntos.
        </p>
        <SeletorAnexos arquivos={novos} aoMudar={setNovos} desabilitado={enviando} />
        {novos.length > 0 && (
          <div className="mt-3 flex justify-end">
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
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : itens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum anexo neste chamado. Envie fotos, vídeos ou documentos para registrar o andamento.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <Badge variant="secondary" className="font-normal">
              {pastas.length} {pastas.length === 1 ? "pasta" : "pastas"}
            </Badge>
            <span className="text-muted-foreground">·</span>
            <Badge variant="outline" className="font-normal">
              {itens.length} {itens.length === 1 ? "anexo" : "anexos"}
            </Badge>
            <span className="text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {totalAutores} {totalAutores === 1 ? "colaborador" : "colaboradores"}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {pastas.length > 1 && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border bg-muted/20 px-4 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setPastasAbertas(pastas.map((p) => p.id))}
                >
                  Expandir todas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setPastasAbertas([])}
                >
                  Recolher todas
                </Button>
              </div>
            )}

            <Accordion
              type="multiple"
              value={pastasAbertas}
              onValueChange={setPastasAbertas}
              className="px-2"
            >
              {pastas.map((pasta) => {
                const { imagens, videos, documentos } = categorizarAnexos(pasta.anexos);
                const galeria = [...imagens, ...videos];
                const resumo = resumoTipos(pasta.anexos);
                const dataPasta = format(new Date(pasta.inicioEm), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                });

                return (
                  <AccordionItem
                    key={pasta.id}
                    value={pasta.id}
                    className="border-border px-2"
                  >
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="flex min-w-0 flex-1 items-start gap-3 pr-2 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Folder className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">
                              Pasta {pasta.numero}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="truncate text-sm text-foreground">
                              {pasta.info.nome}
                            </span>
                            {pasta.autorId === usuarioId && (
                              <Badge variant="outline" className="text-[10px]">
                                Você
                              </Badge>
                            )}
                          </div>
                          {pasta.info.departamentos.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {pasta.info.departamentos.map((dep) => (
                                <Badge
                                  key={dep}
                                  variant="secondary"
                                  className="text-[10px] font-normal"
                                >
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {dataPasta} · {pasta.anexos.length}{" "}
                            {pasta.anexos.length === 1 ? "arquivo" : "arquivos"}
                            {resumo ? ` · ${resumo}` : ""}
                          </p>
                        </div>
                        <Avatar className="hidden h-8 w-8 shrink-0 sm:flex">
                          <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                            {iniciais(pasta.info.nome)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-5 rounded-xl border border-dashed border-border bg-muted/10 p-4">
                        {imagens.length > 0 && (
                          <div>
                            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <ImageIcon className="h-3.5 w-3.5" />
                              Fotos ({imagens.length})
                            </h4>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                              {imagens.map((a) => renderCartaoMidia(a, galeria))}
                            </div>
                          </div>
                        )}

                        {videos.length > 0 && (
                          <div>
                            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <Film className="h-3.5 w-3.5" />
                              Vídeos ({videos.length})
                            </h4>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                              {videos.map((a) => renderCartaoMidia(a, galeria))}
                            </div>
                          </div>
                        )}

                        {documentos.length > 0 && (
                          <div>
                            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <FileIcon className="h-3.5 w-3.5" />
                              Documentos ({documentos.length})
                            </h4>
                            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                              {documentos.map((a) => renderDocumento(a))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </>
      )}

      <Dialog open={!!previa} onOpenChange={(aberto) => !aberto && setPrevia(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previa?.nome}</DialogTitle>
          </DialogHeader>
          {previa && (
            <div className="relative flex max-h-[75vh] items-center justify-center overflow-auto">
              {previa.ids && previa.ids.length > 1 && previa.indice !== undefined && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "absolute left-2 top-1/2 z-10 -translate-y-1/2",
                      previa.indice <= 0 && "pointer-events-none opacity-40",
                    )}
                    onClick={() => navegarPrevia(-1)}
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "absolute right-2 top-1/2 z-10 -translate-y-1/2",
                      previa.indice >= previa.ids.length - 1 && "pointer-events-none opacity-40",
                    )}
                    onClick={() => navegarPrevia(1)}
                    aria-label="Próximo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
              {previa.tipo === "video" ? (
                <video
                  src={previa.url}
                  controls
                  className="max-h-[70vh] w-full rounded-lg bg-black"
                  playsInline
                />
              ) : (
                <img src={previa.url} alt={previa.nome} className="max-h-[70vh] w-auto rounded-lg" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
