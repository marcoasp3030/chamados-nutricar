import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useAdicionarComentario,
  useComentariosChecklist,
  useExcluirComentario,
} from "@/hooks/useComentariosChecklist";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { EditorMencoes, extrairMencoes, type OpcaoMencao } from "@/componentes/comum/EditorMencoes";
import { cn } from "@/lib/utils";
import { obterUsuarioAtual } from "@/auth/atual";

interface Props {
  checklistId: string;
  workspaceId: string;
  nomeChecklist?: string;
  className?: string;
  compact?: boolean;
}

interface MembroMencionavel {
  id: string;
  nome: string;
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type ParteConteudo =
  | { tipo: "texto"; v: string }
  | { tipo: "mencao"; v: string; id: string; nome: string };

function renderizarConteudo(
  texto: string,
  membrosPorNome: Map<string, MembroMencionavel>,
): ParteConteudo[] {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const partes: ParteConteudo[] = [];
  const regex = /@([\p{L}\p{N}._\-]+(?:\s+[\p{L}\p{N}._\-]+){0,3})/gu;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) {
    const candidato = m[1];
    const palavras = candidato.split(/\s+/);
    let casou: MembroMencionavel | null = null;
    let comprimentoCasou = 0;
    for (let n = palavras.length; n >= 1; n--) {
      const tentativa = palavras.slice(0, n).join(" ");
      const membro = membrosPorNome.get(norm(tentativa));
      if (membro) {
        casou = membro;
        comprimentoCasou = tentativa.length;
        break;
      }
    }
    if (casou) {
      if (m.index > last) partes.push({ tipo: "texto", v: texto.slice(last, m.index) });
      partes.push({ tipo: "mencao", v: "@" + casou.nome, id: casou.id, nome: casou.nome });
      last = m.index + 1 + comprimentoCasou;
      regex.lastIndex = last;
    }
  }
  if (last < texto.length) partes.push({ tipo: "texto", v: texto.slice(last) });
  return partes;
}

export function PainelComentarios({
  checklistId,
  workspaceId,
  nomeChecklist,
  className,
  compact,
}: Props) {
  const { workspaceAtual } = useWorkspaceStore();
  const { data: comentarios, isLoading } = useComentariosChecklist(checklistId);
  const { data: membros } = useMembrosWorkspace(workspaceId);
  const adicionar = useAdicionarComentario();
  const excluir = useExcluirComentario();
  const [conteudo, setConteudo] = useState("");

  const { data: usuario } = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => {
      const data = { user: await obterUsuarioAtual() };
      return data.user?.id ?? null;
    },
  });

  const opcoes: OpcaoMencao[] = useMemo(
    () =>
      (membros ?? [])
        .map((m) => ({ id: m.usuario_id, nome: m.perfil.nome, email: m.perfil.email }))
        .filter((o) => o.id !== usuario),
    [membros, usuario],
  );

  const membrosPorNome = useMemo(() => {
    const m = new Map<string, MembroMencionavel>();
    for (const x of membros ?? []) {
      const chave = x.perfil.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      m.set(chave, { id: x.usuario_id, nome: x.perfil.nome });
    }
    return m;
  }, [membros]);

  const enviar = () => {
    if (!conteudo.trim()) return;
    const mencionados = extrairMencoes(conteudo, opcoes);
    adicionar.mutate(
      {
        checklistId,
        workspaceId,
        conteudo,
        mencionados,
        nomeChecklist,
        slugWorkspace: workspaceAtual?.slug,
      },
      {
        onSuccess: () => setConteudo(""),
        onError: (e: Error) =>
          toast.error("Não foi possível comentar.", { description: e.message }),
      },
    );
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className={cn("flex-1 space-y-3 overflow-y-auto", compact ? "max-h-[320px]" : "")}>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (comentarios ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhum comentário ainda. Use @ para mencionar a equipe.
          </p>
        ) : (
          (comentarios ?? []).map((c) => {
            const meu = usuario === c.autor_id;
            const partes = renderizarConteudo(c.conteudo, membrosPorNome);
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                    {iniciais(c.autor_nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-card px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{c.autor_nome}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.criado_em), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {meu && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Excluir este comentário?")) excluir.mutate(c.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {partes.map((p, i) =>
                      p.tipo === "mencao" ? (
                        workspaceAtual ? (
                          <Link
                            key={i}
                            to="/w/$slug/membros/$usuarioId"
                            params={{ slug: workspaceAtual.slug, usuarioId: p.id }}
                            title={`Ver perfil de ${p.nome}`}
                            className="rounded bg-primary/10 px-1 font-medium text-primary hover:bg-primary/20 hover:underline"
                          >
                            {p.v}
                          </Link>
                        ) : (
                          <span
                            key={i}
                            className="rounded bg-primary/10 px-1 font-medium text-primary"
                          >
                            {p.v}
                          </span>
                        )
                      ) : (
                        <span key={i}>{p.v}</span>
                      ),
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
        <EditorMencoes
          value={conteudo}
          onChange={setConteudo}
          onSubmit={enviar}
          opcoes={opcoes}
          placeholder="Escreva uma atualização. Use @ para mencionar alguém."
          rows={3}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            @ menciona · Ctrl+Enter envia
          </span>
          <Button size="sm" onClick={enviar} disabled={!conteudo.trim() || adicionar.isPending}>
            {adicionar.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Comentar
          </Button>
        </div>
      </div>
    </div>
  );
}
