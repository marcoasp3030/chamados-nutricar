import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MembroWorkspace } from "@/hooks/useMembrosWorkspace";

export interface DadosAtribuicaoTecnico {
  tecnicoId: string;
  dataExecucao?: string;
}

interface Props {
  aberto: boolean;
  aoAbrirChange: (aberto: boolean) => void;
  membros: MembroWorkspace[];
  tecnicoInicial?: string | null;
  responsavelAtualId?: string | null;
  quantidadeChamados?: number;
  pendente?: boolean;
  onConfirmar: (dados: DadosAtribuicaoTecnico) => void;
}

export function DialogAtribuirTecnico({
  aberto,
  aoAbrirChange,
  membros,
  tecnicoInicial,
  responsavelAtualId,
  quantidadeChamados = 1,
  pendente = false,
  onConfirmar,
}: Props) {
  const [tecnicoId, setTecnicoId] = useState("");
  const [definirData, setDefinirData] = useState(false);
  const [dataExecucao, setDataExecucao] = useState("");

  const tecnicos = useMemo(
    () =>
      membros.filter(
        (m) =>
          m.ativo &&
          (m.papel === "Suporte" || m.usuario_id === responsavelAtualId),
      ),
    [membros, responsavelAtualId],
  );

  useEffect(() => {
    if (!aberto) return;
    setTecnicoId(tecnicoInicial ?? "");
    setDefinirData(false);
    setDataExecucao("");
  }, [aberto, tecnicoInicial]);

  function confirmar() {
    if (!tecnicoId) return;
    if (definirData && !dataExecucao) return;
    onConfirmar({
      tecnicoId,
      dataExecucao: definirData && dataExecucao ? dataExecucao : undefined,
    });
  }

  const plural = quantidadeChamados > 1;
  const dataInvalida = definirData && !dataExecucao;

  return (
    <Dialog open={aberto} onOpenChange={aoAbrirChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {plural ? `Atribuir ${quantidadeChamados} chamados` : "Atribuir ao técnico"}
          </DialogTitle>
          <DialogDescription>
            {plural
              ? "Escolha o técnico responsável pelos chamados selecionados."
              : "Escolha o técnico responsável por este chamado."}{" "}
            Opcionalmente, defina uma data de execução — o chamado ficará como Agendado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="atribuir-tecnico">Técnico *</Label>
            <Select value={tecnicoId || undefined} onValueChange={setTecnicoId}>
              <SelectTrigger id="atribuir-tecnico">
                <SelectValue placeholder="Selecione o técnico" />
              </SelectTrigger>
              <SelectContent>
                {tecnicos.map((m) => (
                  <SelectItem key={m.usuario_id} value={m.usuario_id}>
                    {m.perfil.nome}
                    {m.papel === "Suporte" ? " (Suporte)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40">
            <Checkbox
              checked={definirData}
              onCheckedChange={(v) => setDefinirData(!!v)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <span className="text-sm font-medium">Definir data de execução</span>
              <p className="text-xs text-muted-foreground">
                Use quando o atendimento precisar ocorrer em data específica. O técnico verá o
                agendamento no chamado.
              </p>
            </div>
          </label>

          {definirData && (
            <div className="space-y-2">
              <Label htmlFor="atribuir-data" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Data e hora de execução *
              </Label>
              <Input
                id="atribuir-data"
                type="datetime-local"
                value={dataExecucao}
                onChange={(e) => setDataExecucao(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => aoAbrirChange(false)} disabled={pendente}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={pendente || !tecnicoId || dataInvalida}
          >
            {pendente ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Atribuindo...
              </>
            ) : plural ? (
              `Atribuir ${quantidadeChamados} chamados`
            ) : (
              "Confirmar atribuição"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
