import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mail, Phone, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { useMembrosWorkspace } from "@/hooks/useMembrosWorkspace";
import { rotuloPapel } from "@/utilitarios/traducoes";
import { db } from "@/dados/atual";

interface Props {
  usuarioId: string;
}

export function PerfilMembro({ usuarioId }: Props) {
  const { workspaceAtual } = useWorkspaceStore();
  const { data: membros, isLoading } = useMembrosWorkspace(workspaceAtual?.id, {
    incluirInativos: true,
  });
  const membro = membros?.find((m) => m.usuario_id === usuarioId);

  const { data: departamentos } = useQuery({
    queryKey: ["departamentos", workspaceAtual?.id],
    enabled: !!workspaceAtual?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("departamentos")
        .select("id, nome")
        .eq("workspace_id", workspaceAtual!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!workspaceAtual) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to="/w/$slug" params={{ slug: workspaceAtual.slug }}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !membro ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Usuário não encontrado neste workspace.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              {membro.perfil.avatar_url && (
                <AvatarImage src={membro.perfil.avatar_url} alt={membro.perfil.nome} />
              )}
              <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                {membro.perfil.nome
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? "")
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold">{membro.perfil.nome}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {rotuloPapel[membro.papel as keyof typeof rotuloPapel] ?? membro.papel}
                </Badge>
                {!membro.ativo && <Badge variant="outline">Inativo</Badge>}
                {membro.cargo && <Badge variant="outline">{membro.cargo}</Badge>}
              </div>
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
            {membro.perfil.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${membro.perfil.email}`}
                  className="text-primary hover:underline"
                >
                  {membro.perfil.email}
                </a>
              </div>
            )}
            {membro.perfil.telefone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{membro.perfil.telefone}</span>
              </div>
            )}
            {membro.departamento_ids.length > 0 && departamentos && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Departamentos</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {membro.departamento_ids.map((id) => {
                    const d = departamentos.find((x) => x.id === id);
                    return (
                      <Badge key={id} variant="outline">
                        {d?.nome ?? "—"}
                      </Badge>
                    );
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
