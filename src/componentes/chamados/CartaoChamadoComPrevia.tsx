import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BadgePrioridade } from "./BadgePrioridade";
import { CartaoChamado } from "./CartaoChamado";
import { rotuloStatusChamado } from "@/utilitarios/traducoes";
import type { ChamadoComPessoas } from "@/tipos/chamado";

function iniciais(n?: string | null) {
  if (!n) return "?";
  return n
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function CartaoChamadoComPrevia({
  chamado,
  slug,
  onDragStart,
}: {
  chamado: ChamadoComPessoas;
  slug: string;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  return (
    <HoverCard openDelay={250} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div>
          <CartaoChamado chamado={chamado} slug={slug} onDragStart={onDragStart} />
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        className="w-96 space-y-3 p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-xs text-muted-foreground">
              {chamado.codigo ?? `#${chamado.numero}`}
            </div>
            <h4 className="text-sm font-semibold leading-tight">{chamado.titulo}</h4>
          </div>
          <BadgePrioridade prioridade={chamado.prioridade} className="shrink-0" />
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="secondary">{rotuloStatusChamado[chamado.status]}</Badge>
          <Badge variant="outline">{chamado.tipo}</Badge>
          {chamado.categoria && <Badge variant="outline">{chamado.categoria}</Badge>}
          {chamado.loja && <Badge variant="outline">📍 {chamado.loja}</Badge>}
        </div>

        {chamado.descricao && (
          <p className="line-clamp-6 whitespace-pre-wrap text-xs text-muted-foreground">
            {chamado.descricao}
          </p>
        )}

        {chamado.tags && chamado.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {chamado.tags.map((t) => (
              <span
                key={t}
                className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-t pt-2 text-xs">
          <Pessoa rotulo="Solicitante" p={chamado.solicitante} />
          <Pessoa rotulo="Responsável" p={chamado.responsavel} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Criado: </span>
            {format(new Date(chamado.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </div>
          {chamado.prazo && (
            <div>
              <span className="font-medium text-foreground">Prazo: </span>
              {format(new Date(chamado.prazo), "dd/MM/yyyy", { locale: ptBR })}
            </div>
          )}
          {chamado.agendado_para && (
            <div>
              <span className="font-medium text-foreground">Agendado: </span>
              {format(new Date(chamado.agendado_para), "dd/MM HH:mm", { locale: ptBR })}
            </div>
          )}
          {chamado.resolvido_em && (
            <div>
              <span className="font-medium text-foreground">Resolvido: </span>
              {format(new Date(chamado.resolvido_em), "dd/MM/yyyy", { locale: ptBR })}
            </div>
          )}
        </div>

        {chamado.tratativa && (
          <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            <div className="font-medium">Tratativa</div>
            <p className="line-clamp-3 whitespace-pre-wrap">{chamado.tratativa}</p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function Pessoa({
  rotulo,
  p,
}: {
  rotulo: string;
  p?: { nome: string; email: string } | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
          {iniciais(p?.nome)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{rotulo}</div>
        <div className="truncate text-xs font-medium">
          {p?.nome ?? "—"}
        </div>
      </div>
    </div>
  );
}
