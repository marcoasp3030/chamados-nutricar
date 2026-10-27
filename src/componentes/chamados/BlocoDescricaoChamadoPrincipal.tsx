import { Link } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";
import { TextoMultilinha } from "@/componentes/suporte/TextoMultilinha";
import type { Chamado } from "@/tipos/chamado";
import { cn } from "@/lib/utils";

interface Props {
  chamado: Pick<
    Chamado,
    | "chamado_pai_id"
    | "descricao_chamado_pai"
    | "titulo_chamado_pai"
    | "numero_chamado_pai"
    | "codigo_chamado_pai"
  >;
  slug: string;
  variante?: "padrao" | "app";
  className?: string;
}

export function BlocoDescricaoChamadoPrincipal({
  chamado,
  slug,
  variante = "padrao",
  className,
}: Props) {
  if (!chamado.chamado_pai_id && !chamado.descricao_chamado_pai && !chamado.titulo_chamado_pai) {
    return null;
  }

  const rotulo = chamado.codigo_chamado_pai ?? (chamado.numero_chamado_pai ? `#${chamado.numero_chamado_pai}` : null);
  const titulo = chamado.titulo_chamado_pai ?? "Chamado principal";
  const descricao = chamado.descricao_chamado_pai;

  if (variante === "app") {
    return (
      <section
        className={cn(
          "overflow-hidden rounded-2xl border border-indigo-500/25 bg-indigo-500/5 shadow-sm",
          className,
        )}
      >
        <div className="border-b border-indigo-500/15 bg-indigo-500/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            <GitBranch className="h-3.5 w-3.5 shrink-0" />
            Chamado principal
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{titulo}</p>
          {rotulo && <p className="font-mono text-xs text-muted-foreground">{rotulo}</p>}
          {chamado.numero_chamado_pai && (
            <Link
              to="/w/$slug/chamados/$numero"
              params={{ slug, numero: String(chamado.numero_chamado_pai) }}
              className="mt-1 inline-block text-xs font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
            >
              Abrir chamado principal
            </Link>
          )}
        </div>
        <div className="p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Descrição do chamado principal
          </p>
          {descricao ? (
            <TextoMultilinha
              texto={descricao}
              classeLinha="text-[15px] leading-7 text-foreground break-words"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Sem descrição no chamado principal.</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-5",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-100">
            <GitBranch className="h-4 w-4" />
            Chamado principal
          </h2>
          <p className="mt-1 text-sm font-medium text-foreground">{titulo}</p>
          {rotulo && <p className="font-mono text-xs text-muted-foreground">{rotulo}</p>}
        </div>
        {chamado.numero_chamado_pai && (
          <Link
            to="/w/$slug/chamados/$numero"
            params={{ slug, numero: String(chamado.numero_chamado_pai) }}
            className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
          >
            Ver chamado principal
          </Link>
        )}
      </div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Descrição do chamado principal
      </h3>
      {descricao ? (
        <TextoMultilinha
          texto={descricao}
          classeLinha="text-sm leading-6 text-foreground break-words"
        />
      ) : (
        <p className="text-sm text-muted-foreground">Sem descrição no chamado principal.</p>
      )}
    </section>
  );
}
