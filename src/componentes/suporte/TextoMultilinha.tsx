import { paragrafosTexto } from "@/utilitarios/texto-multilinha";
import { cn } from "@/lib/utils";

interface Props {
  texto: string;
  className?: string;
  /** Estilo de parágrafo (cada bloco separado por linha em branco). */
  classeParagrafo?: string;
  /** Estilo de cada linha dentro do parágrafo. */
  classeLinha?: string;
  vazio?: React.ReactNode;
}

export function TextoMultilinha({
  texto,
  className,
  classeParagrafo = "space-y-1",
  classeLinha = "text-[15px] leading-7 text-foreground break-words",
  vazio,
}: Props) {
  const blocos = paragrafosTexto(texto);

  if (blocos.length === 0) {
    return vazio ? <div className={className}>{vazio}</div> : null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {blocos.map((linhas, i) => (
        <div key={i} className={classeParagrafo}>
          {linhas.map((linha, j) => (
            <p key={j} className={classeLinha}>
              {linha || "\u00A0"}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
