import { useState } from "react";
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
import { PRIORIDADES_CHAMADO, type PrioridadeChamado } from "@/tipos/chamado";
import { STATUS_TAREFA, type StatusTarefa, type Tarefa } from "@/tipos/projeto";
import { rotuloPrioridade, rotuloStatusTarefa } from "@/utilitarios/traducoes";

export interface DadosTarefa {
  titulo: string;
  descricao: string;
  status: StatusTarefa;
  prioridade: PrioridadeChamado;
  responsavel_id: string | null;
  prazo: string | null;
}

interface Props {
  workspaceId: string;
  inicial?: Partial<Tarefa>;
  enviando?: boolean;
  rotuloEnvio?: string;
  aoCancelar?: () => void;
  aoEnviar: (dados: DadosTarefa) => void | Promise<void>;
}

export function FormularioTarefa({
  workspaceId,
  inicial,
  enviando,
  rotuloEnvio = "Criar tarefa",
  aoCancelar,
  aoEnviar,
}: Props) {
  const { data: membros } = useMembrosWorkspace(workspaceId);
  const [dados, setDados] = useState<DadosTarefa>({
    titulo: inicial?.titulo ?? "",
    descricao: inicial?.descricao ?? "",
    status: (inicial?.status as StatusTarefa) ?? "A fazer",
    prioridade: (inicial?.prioridade as PrioridadeChamado) ?? "Media",
    responsavel_id: inicial?.responsavel_id ?? null,
    prazo: inicial?.prazo ?? null,
  });

  function atualizar<K extends keyof DadosTarefa>(k: K, v: DadosTarefa[K]) {
    setDados((d) => ({ ...d, [k]: v }));
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!dados.titulo.trim()) return;
    aoEnviar({ ...dados, titulo: dados.titulo.trim() });
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título *</Label>
        <Input
          id="titulo"
          required
          maxLength={200}
          value={dados.titulo}
          onChange={(e) => atualizar("titulo", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          rows={3}
          value={dados.descricao}
          onChange={(e) => atualizar("descricao", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={dados.status} onValueChange={(v) => atualizar("status", v as StatusTarefa)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_TAREFA.map((s) => (
                <SelectItem key={s} value={s}>{rotuloStatusTarefa[s]}</SelectItem>
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
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORIDADES_CHAMADO.map((p) => (
                <SelectItem key={p} value={p}>{rotuloPrioridade[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Responsável</Label>
          <Select
            value={dados.responsavel_id ?? "__nenhum__"}
            onValueChange={(v) => atualizar("responsavel_id", v === "__nenhum__" ? null : v)}
          >
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__nenhum__">Sem responsável</SelectItem>
              {(membros ?? []).map((m) => (
                <SelectItem key={m.usuario_id} value={m.usuario_id}>{m.perfil.nome}</SelectItem>
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
