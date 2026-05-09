import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Copy, Loader2, Mail, Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useDepartamentos } from "./AbaDepartamentos";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CARGOS = ["Funcionario", "Supervisor", "Gestor", "Gerente"] as const;
type Cargo = (typeof CARGOS)[number];

const PAPEIS = [
  "Solicitante",
  "Atendente",
  "Gestor",
  "Administrador",
  "Proprietario",
] as const;
type Papel = (typeof PAPEIS)[number];

const rotuloCargo: Record<Cargo, string> = {
  Funcionario: "Funcionário",
  Supervisor: "Supervisor",
  Gestor: "Gestor",
  Gerente: "Gerente",
};

const rotuloPapel: Record<Papel, string> = {
  Solicitante: "Solicitante",
  Atendente: "Atendente",
  Gestor: "Gestor",
  Administrador: "Administrador",
  Proprietario: "Proprietário",
};

const conviteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z
    .string()
    .trim()
    .max(30, "Máximo 30 caracteres")
    .optional()
    .or(z.literal("")),
  papel: z.enum(PAPEIS as unknown as [string, ...string[]]),
  cargo: z.enum(CARGOS as unknown as [string, ...string[]]),
  departamento_id: z.string().uuid().nullable(),
});

interface Convite {
  id: string;
  email: string;
  nome: string | null;
  telefone: string | null;
  papel: string;
  cargo: string | null;
  departamento_id: string | null;
  token: string;
  aceito: boolean;
  expira_em: string;
  criado_em: string;
}

function iniciais(n?: string | null) {
  if (!n) return "?";
  return n
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AbaUsuarios() {
  const { workspaceAtual } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { data: membros, isLoading: carregandoMembros } = useMembrosWorkspace(
    workspaceAtual?.id,
  );
  const { data: departamentos } = useDepartamentos(workspaceAtual?.id);

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    papel: "Solicitante" as Papel,
    cargo: "Funcionario" as Cargo,
    departamento_id: null as string | null,
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [convitePronto, setConvitePronto] = useState<{ url: string; email: string } | null>(
    null,
  );
  const [removerConvite, setRemoverConvite] = useState<Convite | null>(null);

  // Edição / remoção de membros ativos
  type MembroAtivo = NonNullable<typeof membros>[number];
  const [editandoMembro, setEditandoMembro] = useState<MembroAtivo | null>(null);
  const [removerMembro, setRemoverMembro] = useState<MembroAtivo | null>(null);
  const [formMembro, setFormMembro] = useState({
    nome: "",
    telefone: "",
    cargo: "Funcionario" as Cargo,
    departamento_id: null as string | null,
  });
  const [errosMembro, setErrosMembro] = useState<Record<string, string>>({});

  const podeAdministrar =
    workspaceAtual?.papel === "Proprietario" || workspaceAtual?.papel === "Administrador";

  const [usuarioAtualId, setUsuarioAtualId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUsuarioAtualId(data.user?.id ?? null));
  }, []);

  function abrirEdicaoMembro(m: MembroAtivo) {
    setErrosMembro({});
    setFormMembro({
      nome: m.perfil.nome ?? "",
      telefone: m.perfil.telefone ?? "",
      cargo: (m.cargo as Cargo) ?? "Funcionario",
      departamento_id: m.departamento_id,
    });
    setEditandoMembro(m);
  }

  const salvarMembro = useMutation({
    mutationFn: async () => {
      if (!editandoMembro) throw new Error("Membro inválido");
      const schema = z.object({
        nome: z.string().trim().min(2, "Informe o nome").max(120),
        telefone: z.string().trim().max(30).optional().or(z.literal("")),
        cargo: z.enum(CARGOS as unknown as [string, ...string[]]),
        departamento_id: z.string().uuid().nullable(),
      });
      const parse = schema.safeParse(formMembro);
      if (!parse.success) {
        const f: Record<string, string> = {};
        for (const [k, v] of Object.entries(parse.error.flatten().fieldErrors)) {
          if (v && v[0]) f[k] = v[0];
        }
        setErrosMembro(f);
        throw new Error("Verifique os campos");
      }

      const { error: erroPerfil } = await supabase
        .from("perfis")
        .update({
          nome: parse.data.nome,
          telefone: parse.data.telefone || null,
        })
        .eq("id", editandoMembro.usuario_id);
      if (erroPerfil) throw erroPerfil;

      const { error: erroMembro } = await supabase
        .from("workspace_membros")
        .update({
          cargo: parse.data.cargo as Cargo,
          departamento_id: parse.data.departamento_id,
        })
        .eq("id", editandoMembro.id);
      if (erroMembro) throw erroMembro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membros-workspace"] });
      toast.success("Membro atualizado.");
      setEditandoMembro(null);
    },
    onError: (e: Error) => {
      if (e.message !== "Verifique os campos") {
        toast.error("Não foi possível salvar.", { description: e.message });
      }
    },
  });

  const desativarMembro = useMutation({
    mutationFn: async (membroId: string) => {
      const { error } = await supabase
        .from("workspace_membros")
        .update({ ativo: false })
        .eq("id", membroId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membros-workspace"] });
      toast.success("Membro removido.");
      setRemoverMembro(null);
    },
    onError: (e: Error) =>
      toast.error("Não foi possível remover.", { description: e.message }),
  });

  const { data: convites, isLoading: carregandoConvites } = useQuery({
    queryKey: ["convites", workspaceAtual?.id],
    enabled: !!workspaceAtual?.id,
    queryFn: async (): Promise<Convite[]> => {
      const { data, error } = await supabase
        .from("workspace_convites")
        .select(
          "id, email, nome, telefone, papel, cargo, departamento_id, token, aceito, expira_em, criado_em",
        )
        .eq("workspace_id", workspaceAtual!.id)
        .eq("aceito", false)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const mapaDepartamentos = useMemo(
    () => new Map((departamentos ?? []).map((d) => [d.id, d.nome])),
    [departamentos],
  );

  function resetar() {
    setForm({
      nome: "",
      email: "",
      telefone: "",
      papel: "Solicitante",
      cargo: "Funcionario",
      departamento_id: null,
    });
    setErros({});
  }

  const criarConvite = useMutation({
    mutationFn: async () => {
      const parse = conviteSchema.safeParse(form);
      if (!parse.success) {
        const f: Record<string, string> = {};
        for (const [k, v] of Object.entries(parse.error.flatten().fieldErrors)) {
          if (v && v[0]) f[k] = v[0];
        }
        setErros(f);
        throw new Error("Verifique os campos");
      }
      if (!workspaceAtual) throw new Error("Workspace inválido");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");

      const { data, error } = await supabase
        .from("workspace_convites")
        .insert({
          workspace_id: workspaceAtual.id,
          email: parse.data.email.toLowerCase(),
          nome: parse.data.nome,
          telefone: parse.data.telefone || null,
          papel: parse.data.papel as Papel,
          cargo: parse.data.cargo as Cargo,
          departamento_id: parse.data.departamento_id,
          convidado_por: u.user.id,
        })
        .select("token, email")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["convites"] });
      const url = `${window.location.origin}/convite/${data.token}`;
      setConvitePronto({ url, email: data.email });
      toast.success("Convite criado.");
      setAberto(false);
      resetar();
    },
    onError: (e: Error) => {
      if (e.message !== "Verifique os campos") {
        toast.error("Não foi possível criar o convite.", { description: e.message });
      }
    },
  });

  const excluirConvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_convites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convites"] });
      toast.success("Convite removido.");
      setRemoverConvite(null);
    },
    onError: (e: Error) =>
      toast.error("Não foi possível remover.", { description: e.message }),
  });

  function copiar(texto: string) {
    navigator.clipboard.writeText(texto);
    toast.success("Link copiado.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usuários da empresa</h2>
          <p className="text-sm text-muted-foreground">
            Convide pessoas para acessar o workspace, defina cargo, departamento e nível de acesso.
          </p>
        </div>
        <Button onClick={() => { resetar(); setAberto(true); }}>
          <UserPlus className="h-4 w-4" /> Novo usuário
        </Button>
      </div>

      {/* Membros ativos */}
      <section className="rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Membros ativos</h3>
          </div>
          <Badge variant="secondary">{membros?.length ?? 0}</Badge>
        </header>
        {carregandoMembros ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !membros || membros.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum membro ainda.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {membros.map((m) => {
              const ehProprio = m.usuario_id === workspaceAtual?.id;
              const ehProprietario = m.papel === "Proprietario";
              const podeEditar = podeAdministrar;
              const podeRemover = podeAdministrar && !ehProprietario && !ehProprio;
              return (
                <li key={m.usuario_id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {iniciais(m.perfil.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.perfil.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.perfil.email}
                      {m.perfil.telefone && <> · {m.perfil.telefone}</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.cargo && (
                      <Badge variant="outline">
                        {rotuloCargo[m.cargo as Cargo] ?? m.cargo}
                      </Badge>
                    )}
                    {m.departamento_id && mapaDepartamentos.get(m.departamento_id) && (
                      <Badge variant="secondary">
                        {mapaDepartamentos.get(m.departamento_id)}
                      </Badge>
                    )}
                    <Badge>{rotuloPapel[m.papel as Papel] ?? m.papel}</Badge>
                  </div>
                  {(podeEditar || podeRemover) && (
                    <div className="flex shrink-0 gap-1">
                      {podeEditar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirEdicaoMembro(m)}
                          title="Editar membro"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {podeRemover && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemoverMembro(m)}
                          title="Remover membro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Convites pendentes */}
      <section className="rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Convites pendentes</h3>
          </div>
          <Badge variant="secondary">{convites?.length ?? 0}</Badge>
        </header>
        {carregandoConvites ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !convites || convites.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum convite pendente.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {convites.map((c) => {
              const url = `${window.location.origin}/convite/${c.token}`;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.nome ?? c.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.email}
                      {c.telefone && <> · {c.telefone}</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.cargo && (
                      <Badge variant="outline">{rotuloCargo[c.cargo as Cargo] ?? c.cargo}</Badge>
                    )}
                    {c.departamento_id && mapaDepartamentos.get(c.departamento_id) && (
                      <Badge variant="secondary">
                        {mapaDepartamentos.get(c.departamento_id)}
                      </Badge>
                    )}
                    <Badge>{rotuloPapel[c.papel as Papel] ?? c.papel}</Badge>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copiar(url)} title="Copiar link">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoverConvite(c)}
                      title="Remover convite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Dialog: Novo usuário */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              É gerado um convite com link de acesso. O usuário define a senha ao aceitar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="u-nome">Nome *</Label>
              <Input
                id="u-nome"
                maxLength={120}
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
              {erros.nome && <p className="text-xs text-destructive">{erros.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">E-mail *</Label>
              <Input
                id="u-email"
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              {erros.email && <p className="text-xs text-destructive">{erros.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-tel">Celular</Label>
              <Input
                id="u-tel"
                maxLength={30}
                placeholder="(11) 90000-0000"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
              {erros.telefone && <p className="text-xs text-destructive">{erros.telefone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Select
                value={form.departamento_id ?? "__nenhum__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, departamento_id: v === "__nenhum__" ? null : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__nenhum__">Sem departamento</SelectItem>
                  {(departamentos ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!departamentos || departamentos.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Crie um departamento na aba "Departamentos" primeiro.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Cargo *</Label>
              <Select
                value={form.cargo}
                onValueChange={(v) => setForm((f) => ({ ...f, cargo: v as Cargo }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARGOS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {rotuloCargo[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nível de acesso *</Label>
              <Select
                value={form.papel}
                onValueChange={(v) => setForm((f) => ({ ...f, papel: v as Papel }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPEIS.filter((p) => p !== "Proprietario").map((p) => (
                    <SelectItem key={p} value={p}>
                      {rotuloPapel[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define o que o usuário pode ver e fazer no sistema.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={criarConvite.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => criarConvite.mutate()} disabled={criarConvite.isPending}>
              {criarConvite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Gerar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: convite pronto com link */}
      <Dialog open={!!convitePronto} onOpenChange={(o) => !o && setConvitePronto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convite gerado</DialogTitle>
            <DialogDescription>
              Compartilhe este link com {convitePronto?.email}. Ele expira em 7 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={convitePronto?.url ?? ""} className="font-mono text-xs" />
            <Button
              variant="outline"
              onClick={() => convitePronto && copiar(convitePronto.url)}
            >
              <Copy className="h-4 w-4" /> Copiar
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setConvitePronto(null)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removerConvite} onOpenChange={(o) => !o && setRemoverConvite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O link enviado para <strong>{removerConvite?.email}</strong> deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removerConvite && excluirConvite.mutate(removerConvite.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
