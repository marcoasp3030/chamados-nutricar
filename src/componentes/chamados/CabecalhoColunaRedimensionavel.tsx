import { useCallback } from "react";
import { TableHead } from "@/components/ui/table";
import {
  LARGURA_MAXIMA_COLUNA_LISTA,
  LARGURA_MINIMA_COLUNA_LISTA,
  LARGURAS_PADRAO_COLUNAS_LISTA,
  type IdColunaListaChamados,
} from "@/utilitarios/colunas-lista-chamados";
import { cn } from "@/lib/utils";

interface Props {
  id: IdColunaListaChamados;
  largura: number;
  onRedimensionar: (id: IdColunaListaChamados, largura: number) => void;
  redimensionavel?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function limitarLargura(largura: number) {
  return Math.min(LARGURA_MAXIMA_COLUNA_LISTA, Math.max(LARGURA_MINIMA_COLUNA_LISTA, largura));
}

export function CabecalhoColunaRedimensionavel({
  id,
  largura,
  onRedimensionar,
  redimensionavel = true,
  className,
  children,
}: Props) {
  const aoIniciarArraste = useCallback(
    (evento: React.PointerEvent<HTMLSpanElement>) => {
      if (!redimensionavel) return;
      evento.preventDefault();
      evento.stopPropagation();

      const inicioX = evento.clientX;
      const larguraInicial = largura;

      const mover = (ev: PointerEvent) => {
        const delta = ev.clientX - inicioX;
        onRedimensionar(id, limitarLargura(larguraInicial + delta));
      };

      const parar = () => {
        document.removeEventListener("pointermove", mover);
        document.removeEventListener("pointerup", parar);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", mover);
      document.addEventListener("pointerup", parar);
    },
    [id, largura, onRedimensionar, redimensionavel],
  );

  const aoRestaurarLargura = useCallback(() => {
    onRedimensionar(id, LARGURAS_PADRAO_COLUNAS_LISTA[id]);
  }, [id, onRedimensionar]);

  return (
    <TableHead
      className={cn("relative overflow-hidden", className)}
      style={{ width: largura, minWidth: largura, maxWidth: largura }}
    >
      <div className="min-w-0 truncate pr-2">{children}</div>
      {redimensionavel && (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar coluna"
          title="Arraste para ajustar · duplo clique para restaurar"
          onPointerDown={aoIniciarArraste}
          onDoubleClick={aoRestaurarLargura}
          className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none hover:bg-primary/20 active:bg-primary/30"
        />
      )}
    </TableHead>
  );
}
