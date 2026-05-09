import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useChamados, type FiltrosChamados } from "@/hooks/useChamados";
import { BadgeStatus } from "@/componentes/chamados/BadgeStatus";
import { BadgePrioridade } from "@/componentes/chamados/BadgePrioridade";
import {
  PRIORIDADES_CHAMADO,
  STATUS_CHAMADO,
  type PrioridadeChamado,
  type StatusChamado,
} from "@/tipos/chamado";
import { rotuloPrioridade, rotuloStatusChamado } from "@/utilitarios/traducoes";

export function ListaChamados() {
  const { workspaceAtual } = useWorkspaceStore();
  const [filtros, setFiltros] = useState<FiltrosChamados>({
    status: "Todos",
    prioridade: "Todas",
    busca: "",
    responsavel_id: "Todos",
    somenteRaiz: true,
  });

  const { data, isLoading } = useChamados(workspaceAtual?.id, filtros);

  if (!workspaceAtual) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou número"
            value={filtros.busca ?? ""}
            onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
            className="pl-9"
          />
        </div>

        <Select
          value={filtros.status as string}
          onValueChange={(v) =>
            setFiltros((f) => ({ ...f, status: v as StatusChamado | "Todos" }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os status</SelectItem>
            {STATUS_CHAMADO.map((s) => (
              <SelectItem key={s} value={s}>
                {rotuloStatusChamado[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.prioridade as string}
          onValueChange={(v) =>
            setFiltros((f) => ({ ...f, prioridade: v as PrioridadeChamado | "Todas" }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas prioridades</SelectItem>
            {PRIORIDADES_CHAMADO.map((p) => (
              <SelectItem key={p} value={p}>
                {rotuloPrioridade[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.responsavel_id ?? "Todos"}
          onValueChange={(v) => setFiltros((f) => ({ ...f, responsavel_id: v }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os responsáveis</SelectItem>
            <SelectItem value="MEUS">Atribuídos a mim</SelectItem>
          </SelectContent>
        </Select>

        <Button asChild>
          <Link to="/w/$slug/chamados/novo" params={{ slug: workspaceAtual.slug }}>
            <Plus className="h-4 w-4" /> Novo chamado
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum chamado encontrado com os filtros atuais.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Nº</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
                <TableHead className="w-[120px]">Prioridade</TableHead>
                <TableHead className="w-[180px]">Responsável</TableHead>
                <TableHead className="w-[140px]">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    <Link
                      to="/w/$slug/chamados/$numero"
                      params={{ slug: workspaceAtual.slug, numero: String(c.numero) }}
                      className="hover:underline"
                    >
                      #{c.numero}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/w/$slug/chamados/$numero"
                      params={{ slug: workspaceAtual.slug, numero: String(c.numero) }}
                      className="font-medium hover:underline"
                    >
                      {c.titulo}
                    </Link>
                    {c.solicitante && (
                      <div className="text-xs text-muted-foreground">
                        Solicitado por {c.solicitante.nome}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <BadgeStatus status={c.status} />
                  </TableCell>
                  <TableCell>
                    <BadgePrioridade prioridade={c.prioridade} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.responsavel?.nome ?? (
                      <span className="text-muted-foreground">Sem responsável</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(c.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
