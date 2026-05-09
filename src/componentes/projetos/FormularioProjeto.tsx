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
import {
  STATUS_PROJETO,
  type Projeto,
  type StatusProjeto,
} from "@/tipos/projeto";
import { rotuloStatusProjeto } from "@/utilitarios/traducoes";

export interface DadosProjeto {
  nome: string;
  descricao: string;
  status: StatusProjeto;
  cor: string;
  inicio_em: string | null;
  fim_previsto: string | null;
  responsavel_id: string | null;
}

interface Props {
  workspaceId: string;
  inicial?: Partial<Projeto>;
  enviando?: boolean;
  rotuloEnvio?: string;
  aoCancelar?: () => void;
  aoEnviar: (dados: DadosProjeto) => void | Promise<void>;
}

const CORES = ["#88BE46", "#3B82F6", "#F59E0B", "#EF4444", "#A855F7", "#06B6D4", "#EC4899"];

export function FormularioProjeto({
  workspaceId,
  inicial,
  enviando,
  rotuloEnvio = "Criar projeto",
  aoCancelar,
  aoEnviar,
}: Props) {
  const { data: membros } = useMembrosWorkspace(workspaceId);
  const [dados, setDados] = useState<DadosProjeto>({
    nome: inicial?.nome ?? "",
    descricao: inicial?.descricao ?? "",
    status: (inicial?.status as StatusProjeto) ?? "Planejado",
    cor: inicial?.cor ?? "#88BE46",
    inicio_em: inicial?.inicio_em ?? null,
    fim_previsto: inicial?.fim_previsto ?? null,
    responsavel_id: inicial?.responsavel_id ?? null,
  });

  function atualizar<K extends keyof DadosProjeto>(k: K, v: DadosProjeto[K]) {
    setDados((d) => ({ ...d, [k]: v }));
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!dados.nome.trim()) return;
    aoEnviar({ ...dados, nome: dados.nome.trim() });
  }

  return (
    <form onSubmit={submeter} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do projeto *</Label>
        <Input
          id="nome"
          required
          maxLength={150}
          value={dados.nome}
          onChange={(e) => atualizar("nome", e.target.value)}
          placeholder="Ex.: Implantação do novo CRM"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          rows={4}
          maxLength={2000}
          value={dados.descricao}
          onChange={(e) => atualizar("descricao", e.target.value)}
          placeholder="Objetivo, escopo e contexto do projeto"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={dados.status} onValueChange={(v) => atualizar("status", v as StatusProjeto)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_PROJETO.map((s) => (
                <SelectItem key={s} value={s}>{rotuloStatusProjeto[s]}</SelectItem>
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
          <Label htmlFor="inicio">Início</Label>
          <Input
            id="inicio"
            type="date"
            value={dados.inicio_em ?? ""}
            onChange={(e) => atualizar("inicio_em", e.target.value || null)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fim">Fim previsto</Label>
          <Input
            id="fim"
            type="date"
            value={dados.fim_previsto ?? ""}
            onChange={(e) => atualizar("fim_previsto", e.target.value || null)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {CORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => atualizar("cor", c)}
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                dados.cor === c ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ background: c }}
              aria-label={`Cor ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        {aoCancelar && (
          <Button type="button" variant="outline" onClick={aoCancelar} disabled={enviando}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={enviando || !dados.nome.trim()}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
          {rotuloEnvio}
        </Button>
      </div>
    </form>
  );
}
