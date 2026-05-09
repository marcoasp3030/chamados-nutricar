import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import {
  FormularioChamado,
  type DadosFormularioChamado,
} from "@/componentes/chamados/FormularioChamado";

interface Props {
  chamadoPaiId?: string | null;
}

export function NovoChamado({ chamadoPaiId }: Props) {
  const { workspaceAtual } = useWorkspaceStore();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { pai?: string; status?: string };
  const paiId = chamadoPaiId ?? search?.pai ?? null;
  const statusInicial = search?.status as
    | import("@/tipos/chamado").StatusChamado
    | undefined;

  const criar = useMutation({
    mutationFn: async (dados: DadosFormularioChamado) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !workspaceAtual) throw new Error("Sessão expirada");

      const { data, error } = await supabase
        .from("chamados")
        .insert({
          workspace_id: workspaceAtual.id,
          titulo: dados.titulo,
          descricao: dados.descricao || null,
          tipo: dados.tipo,
          prioridade: dados.prioridade,
          status: dados.status || "Aberto",
          categoria: dados.categoria || null,
          responsavel_id: dados.responsavel_id,
          prazo: dados.prazo,
          chamado_pai_id: paiId,
          solicitante_id: u.user.id,
          criado_por: u.user.id,
          numero: 0,
        })
        .select("numero")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Chamado #${data.numero} criado.`);
      if (workspaceAtual) {
        navigate({
          to: "/w/$slug/chamados/$numero",
          params: { slug: workspaceAtual.slug, numero: String(data.numero) },
        });
      }
    },
    onError: (e: Error) => toast.error("Não foi possível criar.", { description: e.message }),
  });

  if (!workspaceAtual) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">
          {paiId ? "Novo subchamado" : "Novo chamado"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha as informações para registrar um novo {paiId ? "subchamado" : "chamado"}.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <FormularioChamado
          workspaceId={workspaceAtual.id}
          chamadoPaiId={paiId}
          inicial={statusInicial ? { status: statusInicial } : undefined}
          permiteEditarStatus={!!statusInicial}
          enviando={criar.isPending}
          rotuloEnvio={paiId ? "Criar subchamado" : "Criar chamado"}
          aoCancelar={() =>
            navigate({ to: "/w/$slug/chamados", params: { slug: workspaceAtual.slug } })
          }
          aoEnviar={(dados) => criar.mutate(dados)}
        />
      </div>
    </div>
  );
}
