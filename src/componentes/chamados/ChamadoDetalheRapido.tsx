import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  Calendar,
  FileText,
  Folder,
  GitBranch,
  Loader2,
  MessageSquare,
  Store,
  Tag,
  User,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BadgeStatus } from "./BadgeStatus";
import { BadgePrioridade } from "./BadgePrioridade";
import { useComentariosChamado, useSubchamados } from "@/hooks/useChamado";
import type { ChamadoComPessoas } from "@/tipos/chamado";

function iniciais(nome?: string | null) {
  if (!nome) return "?";
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

interface Props {
  chamado: ChamadoComPessoas | null;
  slug: string;
  aoFechar: () => void;
}

export function ChamadoDetalheRapido({ chamado, slug, aoFechar }: Props) {
  const aberto = !!chamado;
  const { data: subs, isLoading: carregandoSubs } = useSubchamados(
    aberto ? chamado!.id : undefined,
  );
  const { data: comentarios, isLoading: carregandoComentarios } = useComentariosChamado(
    aberto ? chamado!.id : undefined,
  );

  return (
    <Sheet open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {chamado && (
          <>
            <SheetHeader className="space-y-2 pr-8">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {chamado.codigo ?? `#${chamado.numero}`}
                </span>
                <BadgeStatus status={chamado.status} />
                <BadgePrioridade prioridade={chamado.prioridade} />
              </div>
              <SheetTitle className="text-xl leading-tight">{chamado.titulo}</SheetTitle>
              {chamado.solicitante && (
                <SheetDescription>
                  Solicitado por {chamado.solicitante.nome} ·{" "}
                  {format(new Date(chamado.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </SheetDescription>
              )}
            </SheetHeader>

            <div className="mt-5 space-y-5">
              {/* Grid de metadados */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <Linha icone={<Tag className="h-3.5 w-3.5" />} rotulo="Tipo" valor={chamado.tipo} />
                <Linha
                  icone={<Folder className="h-3.5 w-3.5" />}
                  rotulo="Categoria"
                  valor={chamado.categoria ?? "—"}
                />
                <Linha
                  icone={<Store className="h-3.5 w-3.5" />}
                  rotulo="Loja"
                  valor={chamado.loja ?? "—"}
                />
                <Linha
                  icone={<Users className="h-3.5 w-3.5" />}
                  rotulo="Departamento"
                  valor={chamado.departamento_id ? "Definido" : "—"}
                />
                <Linha
                  icone={<User className="h-3.5 w-3.5" />}
                  rotulo="Responsável"
                  valor={chamado.responsavel?.nome ?? "Sem responsável"}
                />
                <Linha
                  icone={<Calendar className="h-3.5 w-3.5" />}
                  rotulo="Prazo"
                  valor={
                    chamado.prazo
                      ? format(new Date(chamado.prazo), "dd/MM/yyyy", { locale: ptBR })
                      : "—"
                  }
                />
              </div>

              {/* Tags */}
              {chamado.tags && chamado.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {chamado.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Descrição */}
              <Secao titulo="Descrição" icone={<FileText className="h-4 w-4" />}>
                {chamado.descricao ? (
                  <p className="whitespace-pre-wrap text-sm text-foreground">{chamado.descricao}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Sem descrição.</p>
                )}
              </Secao>

              {/* Subchamados */}
              <Secao
                titulo={`Subchamados${subs ? ` (${subs.length})` : ""}`}
                icone={<GitBranch className="h-4 w-4" />}
              >
                {carregandoSubs ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : !subs || subs.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Nenhum subchamado.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {subs.map((s) => (
                      <li key={s.id}>
                        <Link
                          to="/w/$slug/chamados/$numero"
                          params={{ slug, numero: String(s.numero) }}
                          onClick={aoFechar}
                          className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted/50"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {s.codigo ?? `#${s.numero}`}
                            </span>
                            <span className="truncate">{s.titulo}</span>
                          </span>
                          <BadgeStatus status={s.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Secao>

              {/* Comentários */}
              <Secao
                titulo={`Últimos comentários${comentarios ? ` (${comentarios.length})` : ""}`}
                icone={<MessageSquare className="h-4 w-4" />}
              >
                {carregandoComentarios ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : !comentarios || comentarios.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Sem interações ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {comentarios.slice(-5).reverse().map((c) => (
                      <li
                        key={c.id}
                        className="rounded-md border border-border bg-card p-2.5 text-sm"
                      >
                        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="bg-primary/10 text-[9px] font-semibold text-primary">
                              {iniciais(c.autor?.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">
                            {c.autor?.nome ?? "—"}
                          </span>
                          <span>·</span>
                          <span>
                            {format(new Date(c.criado_em), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                          {c.interno && (
                            <Badge variant="outline" className="text-[9px]">
                              interno
                            </Badge>
                          )}
                        </div>
                        <p className="line-clamp-3 whitespace-pre-wrap text-foreground">
                          {c.conteudo}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Secao>
            </div>

            <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-2 border-t border-border bg-background pt-4">
              <Button variant="outline" onClick={aoFechar}>
                Fechar
              </Button>
              <Button asChild>
                <Link
                  to="/w/$slug/chamados/$numero"
                  params={{ slug, numero: String(chamado.numero) }}
                  onClick={aoFechar}
                >
                  Abrir chamado <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Linha({
  icone,
  rotulo,
  valor,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icone}
        {rotulo}
      </span>
      <span className="truncate text-sm font-medium text-foreground">{valor}</span>
    </div>
  );
}

function Secao({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icone}
        {titulo}
      </h3>
      <div>{children}</div>
    </section>
  );
}
