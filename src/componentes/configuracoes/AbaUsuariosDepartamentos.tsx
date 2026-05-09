import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { useDepartamentos } from "./AbaDepartamentos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

function iniciais(n?: string | null) {
  if (!n) return "?";
  return n
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AbaUsuariosDepartamentos() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { data: membros, isLoading: carregandoMembros } = useMembrosWorkspace(
    workspaceAtual?.id,
  );
  const { data: departamentos, isLoading: carregandoDeptos } = useDepartamentos(
    workspaceAtual?.id,
  );

  const podeAdministrar =
    workspaceAtual?.papel === "Proprietario" || workspaceAtual?.papel === "Administrador";

  const [busca, setBusca] = useState("");
  const [membroSelecionadoId, setMembroSelecionadoId] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const membrosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = membros ?? [];
    if (!q) return lista;
    return lista.filter(
      (m) =>
        m.perfil.nome?.toLowerCase().includes(q) ||
        m.perfil.email?.toLowerCase().includes(q),
    );
  }, [membros, busca]);

  const membroAtual = useMemo(
    () => (membros ?? []).find((m) => m.id === membroSelecionadoId) ?? null,
    [membros, membroSelecionadoId],
  );

  const mapaDeptos = useMemo(
    () => new Map((departamentos ?? []).map((d) => [d.id, d.nome])),
    [departamentos],
  );

  // Auto-seleciona o primeiro ao carregar
  useEffect(() => {
    if (!membroSelecionadoId && (membros?.length ?? 0) > 0) {
      setMembroSelecionadoId(membros![0].id);
    }
  }, [membros, membroSelecionadoId]);

  // Carrega vínculos atuais quando trocar membro
  useEffect(() => {
    if (membroAtual) {
      setSelecionados(membroAtual.departamento_ids ?? []);
    } else {
      setSelecionados([]);
    }
  }, [membroAtual]);

  const originais = membroAtual?.departamento_ids ?? [];
  const sujo =
    membroAtual !== null &&
    (originais.length !== selecionados.length ||
      [...originais].sort().join(",") !== [...selecionados].sort().join(","));

  function alternar(id: string, checked: boolean) {
    setSelecionados((s) => (checked ? [...new Set([...s, id])] : s.filter((x) => x !== id)));
  }

  const salvar = useMutation({
    mutationFn: async () => {
      if (!membroAtual || !workspaceAtual) throw new Error("Selecione um usuário");

      const { error: erroMembro } = await supabase
        .from("workspace_membros")
        .update({ departamento_id: selecionados[0] ?? null })
        .eq("id", membroAtual.id);
      if (erroMembro) throw erroMembro;

      const { error: erroDel } = await supabase
        .from("workspace_membro_departamentos")
        .delete()
        .eq("membro_id", membroAtual.id);
      if (erroDel) throw erroDel;

      if (selecionados.length > 0) {
        const { error: erroIns } = await supabase
          .from("workspace_membro_departamentos")
          .insert(
            selecionados.map((d) => ({
              membro_id: membroAtual.id,
              departamento_id: d,
              workspace_id: workspaceAtual.id,
            })),
          );
        if (erroIns) throw erroIns;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membros-workspace"] });
      toast.success("Departamentos atualizados.");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível salvar.", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Departamentos por usuário</h2>
        <p className="text-sm text-muted-foreground">
          Selecione um usuário e marque os departamentos aos quais ele pertence.
        </p>
      </div>

      {!podeAdministrar && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Apenas Proprietários e Administradores podem alterar os vínculos.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Lista de usuários */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar usuário..."
                className="pl-8"
              />
            </div>
          </div>
          {carregandoMembros ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : membrosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
              {membrosFiltrados.map((m) => {
                const ativo = m.id === membroSelecionadoId;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setMembroSelecionadoId(m.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent",
                        ativo && "bg-accent",
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {iniciais(m.perfil.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.perfil.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.perfil.email}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {(m.departamento_ids ?? []).length}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Painel de vínculos */}
        <div className="rounded-xl border border-border bg-card">
          {!membroAtual ? (
            <div className="flex h-full items-center justify-center px-6 py-16 text-sm text-muted-foreground">
              Selecione um usuário à esquerda.
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <header className="flex items-center gap-3 border-b border-border p-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {iniciais(membroAtual.perfil.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{membroAtual.perfil.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {membroAtual.perfil.email}
                  </p>
                </div>
                <Badge variant="outline">
                  {selecionados.length} {selecionados.length === 1 ? "depto." : "deptos."}
                </Badge>
              </header>

              <div className="flex-1 p-4">
                {selecionados.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {selecionados.map((id) =>
                      mapaDeptos.get(id) ? (
                        <Badge key={id} variant="secondary">
                          {mapaDeptos.get(id)}
                        </Badge>
                      ) : null,
                    )}
                  </div>
                )}

                {carregandoDeptos ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !departamentos || departamentos.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum departamento cadastrado.
                  </p>
                ) : (
                  <div className="grid max-h-[380px] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                    {departamentos.map((d) => {
                      const checked = selecionados.includes(d.id);
                      return (
                        <label
                          key={d.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent",
                            checked && "border-primary/40 bg-primary/5",
                            !podeAdministrar && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={!podeAdministrar}
                            onCheckedChange={(v) => alternar(d.id, v === true)}
                          />
                          <span className="truncate">{d.nome}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <footer className="flex items-center justify-end gap-2 border-t border-border p-3">
                <Button
                  variant="outline"
                  onClick={() => setSelecionados(originais)}
                  disabled={!sujo || salvar.isPending}
                >
                  Descartar
                </Button>
                <Button
                  onClick={() => salvar.mutate()}
                  disabled={!sujo || !podeAdministrar || salvar.isPending}
                >
                  {salvar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar alterações
                </Button>
              </footer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
