import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface OpcaoMencao {
  id: string;
  nome: string;
  email?: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  opcoes: OpcaoMencao[];
  placeholder?: string;
  rows?: number;
  className?: string;
}

/**
 * Textarea com sugestões de @menção. Substitui o trecho "@texto" pelo nome
 * escolhido e devolve o texto bruto. Use `extrairMencoes` para resolver IDs.
 */
export function EditorMencoes({
  value,
  onChange,
  onSubmit,
  opcoes,
  placeholder,
  rows = 3,
  className,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [inicio, setInicio] = useState<number | null>(null);
  const [destacado, setDestacado] = useState(0);

  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const sugestoes = aberto
    ? opcoes
        .filter((o) => !filtro || norm(o.nome).includes(norm(filtro)))
        .slice(0, 6)
    : [];

  useEffect(() => {
    setDestacado(0);
  }, [filtro, aberto]);

  const detectar = (texto: string, cursor: number) => {
    const antes = texto.slice(0, cursor);
    const m = antes.match(/(?:^|\s)@([\p{L}\p{N}._\- ]{0,30})$/u);
    if (m) {
      setAberto(true);
      setFiltro(m[1] ?? "");
      setInicio(cursor - (m[1]?.length ?? 0) - 1);
    } else {
      setAberto(false);
      setInicio(null);
      setFiltro("");
    }
  };

  const inserir = (op: OpcaoMencao) => {
    if (inicio === null || !ref.current) return;
    const cursor = ref.current.selectionStart ?? value.length;
    const antes = value.slice(0, inicio);
    const depois = value.slice(cursor);
    const inserido = `@${op.nome.replace(/\s+/g, " ")} `;
    const novo = antes + inserido + depois;
    onChange(novo);
    setAberto(false);
    setInicio(null);
    setFiltro("");
    requestAnimationFrame(() => {
      const pos = (antes + inserido).length;
      ref.current?.setSelectionRange(pos, pos);
      ref.current?.focus();
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detectar(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (aberto && sugestoes.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setDestacado((d) => (d + 1) % sugestoes.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setDestacado((d) => (d - 1 + sugestoes.length) % sugestoes.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              inserir(sugestoes[destacado]);
              return;
            }
            if (e.key === "Escape") {
              setAberto(false);
              return;
            }
          }
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        onBlur={() => setTimeout(() => setAberto(false), 120)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {aberto && sugestoes.length > 0 && (
        <div className="absolute z-50 mt-1 w-64 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {sugestoes.map((op, i) => (
            <button
              type="button"
              key={op.id}
              onMouseDown={(e) => {
                e.preventDefault();
                inserir(op);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                i === destacado && "bg-accent",
              )}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {op.nome
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? "")
                  .join("")}
              </span>
              <span className="min-w-0 flex-1 truncate">{op.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Resolve menções "@Nome Sobrenome" no texto contra a lista de opções.
 * Retorna IDs únicos correspondentes a nomes encontrados (case/acento-insensitive).
 */
export function extrairMencoes(texto: string, opcoes: OpcaoMencao[]): string[] {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const normalizados = opcoes.map((o) => ({ id: o.id, n: norm(o.nome) }));
  // Ordena por nome mais longo para casar primeiro nomes compostos.
  normalizados.sort((a, b) => b.n.length - a.n.length);
  const t = " " + norm(texto) + " ";
  const ids = new Set<string>();
  for (const { id, n } of normalizados) {
    if (!n) continue;
    if (t.includes(" @" + n + " ") || t.includes(" @" + n + ",") || t.includes(" @" + n + ".")) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}
