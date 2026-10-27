import type { PrioridadeChamado } from "@/tipos/chamado";
import { rotuloPrioridade } from "@/utilitarios/traducoes";
import { cn } from "@/lib/utils";

export type FiltroPrioridadeSuporte = PrioridadeChamado | "Todas";

const CHIPS: { id: FiltroPrioridadeSuporte; rotulo: string }[] = [
  { id: "Todas", rotulo: "Todos" },
  { id: "Urgente", rotulo: rotuloPrioridade.Urgente },
  { id: "Alta", rotulo: rotuloPrioridade.Alta },
  { id: "Media", rotulo: rotuloPrioridade.Media },
  { id: "Baixa", rotulo: rotuloPrioridade.Baixa },
];

const coresChip: Record<FiltroPrioridadeSuporte, string> = {
  Todas: "bg-foreground text-background",
  Urgente: "bg-red-600 text-white",
  Alta: "bg-orange-600 text-white",
  Media: "bg-blue-600 text-white",
  Baixa: "bg-slate-600 text-white",
};

interface Props {
  valor: FiltroPrioridadeSuporte;
  contagens: Record<FiltroPrioridadeSuporte, number>;
  onChange: (v: FiltroPrioridadeSuporte) => void;
}

export function FiltrosPrioridade({ valor, contagens, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CHIPS.map((chip) => {
        const ativo = valor === chip.id;
        const qtd = contagens[chip.id];
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all active:scale-95",
              ativo
                ? cn(coresChip[chip.id], "border-transparent shadow-md")
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {chip.rotulo}
            <span
              className={cn(
                "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-bold tabular-nums",
                ativo ? "bg-black/20" : "bg-muted text-muted-foreground",
              )}
            >
              {qtd}
            </span>
          </button>
        );
      })}
    </div>
  );
}
