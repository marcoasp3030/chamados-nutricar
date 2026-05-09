import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import {
  PRIORIDADES_CHAMADO,
  STATUS_CHAMADO,
  TIPOS_CHAMADO,
  type Chamado,
  type PrioridadeChamado,
  type StatusChamado,
  type TipoChamado,
} from "@/tipos/chamado";
import {
  rotuloPrioridade,
  rotuloStatusChamado,
  rotuloTipoChamado,
} from "@/utilitarios/traducoes";

export interface DadosFormularioChamado {
  titulo: string;
  descricao: string;
  tipo: TipoChamado;
  prioridade: PrioridadeChamado;
  status: StatusChamado;
  categoria: string;
  responsavel_id: string | null;
  prazo: string | null;
  chamado_pai_id: string | null;
}

interface Props {
  workspaceId: string;
  inicial?: Partial<Chamado>;
  permiteEditarStatus?: boolean;
  chamadoPaiId?: string | null;
  enviando?: boolean;
  rotuloEnvio?: string;
  aoCancelar?: () => void;
  aoEnviar: (dados: DadosFormularioChamado) => void | Promise<void>;
}

export function FormularioChamado({
  workspaceId,
  inicial,
  permiteEditarStatus = false,
  chamadoPaiId = null,
  enviando = false,
  rotuloEnvio = "Criar chamado",
  aoCancelar,
  aoEnviar,
}: Props) {
  const { data: membros } = useMembrosWorkspace(workspaceId);
  const [dados, setDados] = useState<DadosFormularioChamado>({
    titulo: inicial?.titulo ?? "",
    descricao: inicial?.descricao ?? "",
    tipo: (inicial?.tipo as TipoChamado) ?? "Solicitacao",
    prioridade: (inicial?.prioridade as PrioridadeChamado) ?? "Media",
    status: (inicial?.status as StatusChamado) ?? "Aberto",
    categoria: inicial?.categoria ?? "",
    responsavel_id: inicial?.responsavel_id ?? null,
    prazo: inicial?.prazo ?? null,
    chamado_pai_id: chamadoPaiId ?? inicial?.chamado_pai_id ?? null,
  });

  useEffect(() => {
    if (chamadoPaiId) setDados((d) => ({ ...d, chamado_pai_id: chamadoPaiId }));
  }, [chamadoPaiId]);

  function atualizar<K extends keyof DadosFormularioChamado>(
    chave: K,
    valor: DadosFormularioChamado[K],
  ) {
    setDados((d) => ({ ...d, [chave]: valor }));
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!dados.titulo.trim()) return;
    aoEnviar({ ...dados, titulo: dados.titulo.trim() });
  }

  return (
    <form onSubmit={submeter} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título *</Label>
        <Input
          id="titulo"
          required
          maxLength={200}
          placeholder="Resuma o problema ou a solicitação"
          value={dados.titulo}
          onChange={(e) => atualizar("titulo", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          rows={5}
          maxLength={5000}
          placeholder="Descreva detalhes, passos para reproduzir, capturas, etc."
          value={dados.descricao}
          onChange={(e) => atualizar("descricao", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={dados.tipo} onValueChange={(v) => atualizar("tipo", v as TipoChamado)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_CHAMADO.map((t) => (
                <SelectItem key={t} value={t}>
                  {rotuloTipoChamado[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select
            value={dados.prioridade}
            onValueChange={(v) => atualizar("prioridade", v as PrioridadeChamado)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADES_CHAMADO.map((p) => (
                <SelectItem key={p} value={p}>
                  {rotuloPrioridade[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {permiteEditarStatus && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={dados.status}
              onValueChange={(v) => atualizar("status", v as StatusChamado)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CHAMADO.map((s) => (
                  <SelectItem key={s} value={s}>
                    {rotuloStatusChamado[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Input
            id="categoria"
            placeholder="Ex.: Financeiro, TI, RH"
            value={dados.categoria}
            onChange={(e) => atualizar("categoria", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Responsável</Label>
          <Select
            value={dados.responsavel_id ?? "__nenhum__"}
            onValueChange={(v) =>
              atualizar("responsavel_id", v === "__nenhum__" ? null : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__nenhum__">Sem responsável</SelectItem>
              {(membros ?? []).map((m) => (
                <SelectItem key={m.usuario_id} value={m.usuario_id}>
                  {m.perfil.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prazo">Prazo</Label>
          <Input
            id="prazo"
            type="datetime-local"
            value={dados.prazo ? dados.prazo.slice(0, 16) : ""}
            onChange={(e) =>
              atualizar("prazo", e.target.value ? new Date(e.target.value).toISOString() : null)
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        {aoCancelar && (
          <Button type="button" variant="outline" onClick={aoCancelar} disabled={enviando}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={enviando || !dados.titulo.trim()}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
          {rotuloEnvio}
        </Button>
      </div>
    </form>
  );
}
