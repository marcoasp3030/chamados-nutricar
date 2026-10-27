import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  PauseCircle,
  Phone,
  PlayCircle,
  RotateCcw,
  Tag,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BlocoDescricaoChamadoPrincipal } from "@/componentes/chamados/BlocoDescricaoChamadoPrincipal";
import { FaixaPrioridade } from "@/componentes/suporte/FaixaPrioridade";
import { TextoMultilinha } from "@/componentes/suporte/TextoMultilinha";
import { useLocalVMPayPorNome } from "@/hooks/useLocaisVMPay";
import type { ChamadoComPessoas, StatusChamado } from "@/tipos/chamado";
import { formatarEnderecoLocal, linkMapaLocal } from "@/utilitarios/vmpay-endereco";
import { cn } from "@/lib/utils";

interface Props {
  chamado: ChamadoComPessoas;
  workspaceId: string;
  slug: string;
  rotaVoltar?: "/w/$slug/suporte" | "/w/$slug/suporte/equipe";
  podeTrabalhar: boolean;
  podeAssumirColega?: boolean;
  podeDevolver: boolean;
  acaoPendente: boolean;
  onTransicao: (status: StatusChamado) => void;
  onDevolver: (justificativa: string) => void;
  onAssumirColega?: () => void;
}

type Acao = {
  rotulo: string;
  status: StatusChamado;
  destaque?: boolean;
  icone: typeof PlayCircle;
};

function acoesPorStatus(status: StatusChamado): Acao[] {
  switch (status) {
    case "Aberto":
      return [
        { rotulo: "Iniciar", status: "Em andamento", destaque: true, icone: PlayCircle },
      ];
    case "Em andamento":
      return [
        { rotulo: "Resolver", status: "Resolvido", destaque: true, icone: CheckCircle2 },
        { rotulo: "Pausar", status: "Pausado", icone: PauseCircle },
      ];
    case "Pausado":
      return [
        { rotulo: "Retomar", status: "Em andamento", destaque: true, icone: PlayCircle },
        { rotulo: "Resolver", status: "Resolvido", icone: CheckCircle2 },
      ];
    case "Agendado":
      return [
        { rotulo: "Iniciar", status: "Em andamento", destaque: true, icone: PlayCircle },
        { rotulo: "Resolver", status: "Resolvido", icone: CheckCircle2 },
      ];
    case "Aguardando solicitante":
    case "Aguardando terceiros":
      return [
        { rotulo: "Retomar", status: "Em andamento", destaque: true, icone: PlayCircle },
        { rotulo: "Resolver", status: "Resolvido", icone: CheckCircle2 },
      ];
    default:
      return [];
  }
}

function CartaoApp({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function DetalheChamadoSuporte({
  chamado,
  workspaceId,
  slug,
  rotaVoltar = "/w/$slug/suporte",
  podeTrabalhar,
  podeAssumirColega = false,
  podeDevolver,
  acaoPendente,
  onTransicao,
  onDevolver,
  onAssumirColega,
}: Props) {
  const [devolvendo, setDevolvendo] = useState(false);
  const [justificativaDevolucao, setJustificativaDevolucao] = useState("");

  const acoes = podeTrabalhar ? acoesPorStatus(chamado.status) : [];
  const loja = chamado.loja?.trim();
  const categoria = chamado.categoria?.trim();
  const { local, isLoading: carregandoEndereco, isFetched: enderecoConsultado } =
    useLocalVMPayPorNome(workspaceId, loja);
  const linhasEndereco = local ? formatarEnderecoLocal(local) : [];
  const urlMapa = local ? linkMapaLocal(local) : null;

  function confirmarDevolucao() {
    const texto = justificativaDevolucao.trim();
    if (texto.length < 10) {
      toast.error("Informe uma justificativa com pelo menos 10 caracteres.");
      return;
    }
    onDevolver(texto);
    setDevolvendo(false);
    setJustificativaDevolucao("");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-lg flex-col bg-muted/30 px-4 py-2">
      <header className="sticky top-0 z-20 -mx-4 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
          >
            <Link to={rotaVoltar} params={{ slug }} aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {chamado.codigo ?? `#${chamado.numero}`}
              </span>
              <BadgeStatus status={chamado.status} />
            </div>
            <h1 className="truncate text-base font-semibold leading-tight text-foreground">
              {chamado.titulo}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-3 px-1 py-4 pb-44">
        <FaixaPrioridade prioridade={chamado.prioridade} />

        {podeAssumirColega && chamado.responsavel && (
          <CartaoApp className="border-indigo-500/30 bg-indigo-500/5">
            <div className="p-4">
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                Chamado com outro técnico
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Responsável atual:{" "}
                <strong className="font-medium text-foreground">{chamado.responsavel.nome}</strong>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Se você está na loja e pode resolver, assuma o chamado para atribuí-lo a você.
              </p>
            </div>
          </CartaoApp>
        )}

        <CartaoApp className="border-primary/20 bg-gradient-to-br from-primary/8 to-card">
          <div className="p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
              <MapPin className="h-4 w-4" />
              Loja
            </div>
            <p className="mt-2 text-xl font-bold leading-snug text-foreground">
              {loja || "Loja não informada"}
            </p>
            {loja && carregandoEndereco && (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Carregando endereço...
              </p>
            )}
            {local && linhasEndereco.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-primary/10 pt-3 text-sm leading-relaxed text-foreground/90">
                {linhasEndereco.map((linha) => (
                  <p key={linha}>{linha}</p>
                ))}
                {local.phone && (
                  <p className="flex items-center gap-1.5 pt-1 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {local.phone}
                  </p>
                )}
                {urlMapa && (
                  <a
                    href={urlMapa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                  >
                    Abrir no mapa
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
            {loja && enderecoConsultado && !local && (
              <p className="mt-2 text-sm text-muted-foreground">
                Endereço não encontrado na VMPay.
              </p>
            )}
          </div>
        </CartaoApp>

        <CartaoApp>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Tag className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Categoria
              </p>
              <p className="text-base font-semibold text-foreground">
                {categoria || "Sem categoria"}
              </p>
            </div>
          </div>
        </CartaoApp>

        {chamado.status === "Pausado" && chamado.motivo_pausa && (
          <CartaoApp className="border-yellow-500/30 bg-yellow-500/5">
            <div className="p-4">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                Motivo da pausa
              </p>
              <TextoMultilinha
                texto={chamado.motivo_pausa}
                className="mt-2"
                classeLinha="text-sm leading-6 text-yellow-900/90 dark:text-yellow-100/90 break-words"
              />
            </div>
          </CartaoApp>
        )}

        {(chamado.status === "Resolvido" || chamado.status === "Fechado") && chamado.tratativa && (
          <CartaoApp className="border-emerald-500/30 bg-emerald-500/5">
            <div className="p-4">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Tratativa realizada
              </p>
              <TextoMultilinha
                texto={chamado.tratativa}
                className="mt-2"
                classeLinha="text-sm leading-6 text-emerald-900/90 dark:text-emerald-100/90 break-words"
              />
              {chamado.resolvido_em && (
                <p className="mt-2 text-xs text-emerald-800/70 dark:text-emerald-200/70">
                  Resolvido em{" "}
                  {format(new Date(chamado.resolvido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          </CartaoApp>
        )}

        {(chamado.chamado_pai_id || chamado.descricao_chamado_pai) && (
          <BlocoDescricaoChamadoPrincipal
            chamado={chamado}
            slug={slug}
            variante="app"
          />
        )}

        <CartaoApp>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {chamado.chamado_pai_id ? "Descrição deste subchamado" : "Descrição do chamado"}
              </h2>
            </div>
            {chamado.descricao ? (
              <TextoMultilinha
                texto={chamado.descricao}
                classeLinha="text-[15px] leading-7 text-foreground break-words"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sem descrição informada.</p>
            )}
          </div>
        </CartaoApp>
      </div>

      {(acoes.length > 0 || podeDevolver || podeAssumirColega) && (
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))] md:left-[var(--sidebar-width,0px)]">
          <div className="mx-auto max-w-lg space-y-2">
            {podeAssumirColega && (
              <Button
                type="button"
                size="lg"
                className="h-12 w-full gap-2 rounded-xl text-base font-semibold"
                disabled={acaoPendente}
                onClick={onAssumirColega}
              >
                {acaoPendente ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <UserPlus className="h-5 w-5" />
                )}
                Assumir chamado
              </Button>
            )}
            {acoes.length > 0 && (
              <div className="flex gap-2">
                {acoes.map((acao) => {
                  const Icone = acao.icone;
                  return (
                    <Button
                      key={acao.rotulo}
                      type="button"
                      size="lg"
                      variant={acao.destaque ? "default" : "outline"}
                      className={cn(
                        "h-12 flex-1 gap-2 rounded-xl text-base font-semibold",
                        acao.status === "Resolvido" &&
                          acao.destaque &&
                          "bg-emerald-600 hover:bg-emerald-700",
                      )}
                      disabled={acaoPendente}
                      onClick={() => onTransicao(acao.status)}
                    >
                      {acaoPendente ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Icone className="h-5 w-5" />
                      )}
                      <span className="truncate">{acao.rotulo}</span>
                    </Button>
                  );
                })}
              </div>
            )}
            {podeDevolver && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl border-amber-500/50 text-amber-800 hover:bg-amber-500/10 dark:text-amber-200"
                disabled={acaoPendente}
                onClick={() => setDevolvendo(true)}
              >
                <RotateCcw className="h-4 w-4" />
                Devolver chamado (atribuição incorreta)
              </Button>
            )}
          </div>
        </footer>
      )}

      <Dialog
        open={devolvendo}
        onOpenChange={(aberto) => {
          if (!aberto && !acaoPendente) {
            setDevolvendo(false);
            setJustificativaDevolucao("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver chamado ao gestor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use esta opção se o chamado foi atribuído a você por engano. O gestor verá sua
              justificativa no histórico do chamado e poderá reatribuir a outro técnico.
            </p>
            <div className="space-y-2">
              <Label htmlFor="justificativa-devolucao">
                Justificativa <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="justificativa-devolucao"
                rows={5}
                placeholder="Ex.: Chamado é da loja de Curitiba e eu atendo apenas região de Joinville."
                value={justificativaDevolucao}
                onChange={(e) => setJustificativaDevolucao(e.target.value)}
                disabled={acaoPendente}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 10 caracteres. Seja objetivo — o gestor lerá este texto.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDevolvendo(false)}
              disabled={acaoPendente}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={acaoPendente || justificativaDevolucao.trim().length < 10}
              onClick={confirmarDevolucao}
            >
              {acaoPendente && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
