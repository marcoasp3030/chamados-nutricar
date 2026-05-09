import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Upload, X, FileIcon, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  arquivos: File[];
  aoMudar: (arquivos: File[]) => void;
  tamanhoMaxMb?: number;
  desabilitado?: boolean;
}

const MIME_IMAGEM = /^image\//;

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function SeletorAnexos({
  arquivos,
  aoMudar,
  tamanhoMaxMb = 20,
  desabilitado = false,
}: Props) {
  const [arrastando, setArrastando] = useState(false);
  const [previas, setPrevias] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const adicionar = useCallback(
    (novos: File[]) => {
      if (desabilitado || novos.length === 0) return;
      const limite = tamanhoMaxMb * 1024 * 1024;
      const validos = novos.filter((f) => f.size <= limite);
      const ignorados = novos.length - validos.length;
      if (ignorados > 0) {
        // Aviso simples sem dependência de toast aqui
        console.warn(`${ignorados} arquivo(s) excederam ${tamanhoMaxMb}MB e foram ignorados.`);
      }
      // Evita duplicatas pelo nome+tamanho
      const chave = (f: File) => `${f.name}__${f.size}`;
      const existentes = new Set(arquivos.map(chave));
      const filtrados = validos.filter((f) => !existentes.has(chave(f)));
      if (filtrados.length === 0) return;
      aoMudar([...arquivos, ...filtrados]);
    },
    [arquivos, aoMudar, tamanhoMaxMb, desabilitado],
  );

  // Gera URLs de prévia para imagens
  useEffect(() => {
    const novas: Record<string, string> = {};
    arquivos.forEach((f) => {
      if (MIME_IMAGEM.test(f.type)) {
        const chave = `${f.name}__${f.size}__${f.lastModified}`;
        if (!previas[chave]) {
          novas[chave] = URL.createObjectURL(f);
        }
      }
    });
    if (Object.keys(novas).length > 0) {
      setPrevias((p) => ({ ...p, ...novas }));
    }
    return () => {
      Object.values(novas).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arquivos]);

  // Cola com Ctrl+V em qualquer lugar enquanto o componente estiver montado
  useEffect(() => {
    if (desabilitado) return;
    function aoColar(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const itens = Array.from(e.clipboardData.files);
      if (itens.length > 0) {
        e.preventDefault();
        adicionar(itens);
      }
    }
    window.addEventListener("paste", aoColar);
    return () => window.removeEventListener("paste", aoColar);
  }, [adicionar, desabilitado]);

  function aoSoltar(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(false);
    if (desabilitado) return;
    const itens = Array.from(e.dataTransfer.files);
    if (itens.length > 0) adicionar(itens);
  }

  function remover(idx: number) {
    aoMudar(arquivos.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div
        ref={dropRef}
        onDragOver={(e) => {
          e.preventDefault();
          if (!desabilitado) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        onClick={() => !desabilitado && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50",
          arrastando && "border-primary bg-primary/5",
          desabilitado && "cursor-not-allowed opacity-60",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-sm">
          <span className="font-medium text-foreground">Clique para selecionar</span>{" "}
          <span className="text-muted-foreground">
            ou arraste arquivos aqui — também é possível colar com Ctrl+V
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Até {tamanhoMaxMb}MB por arquivo
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={desabilitado}
          onChange={(e) => {
            const arquivos = Array.from(e.target.files ?? []);
            adicionar(arquivos);
            e.target.value = "";
          }}
        />
      </div>

      {arquivos.length > 0 && (
        <ul className="space-y-2">
          {arquivos.map((f, i) => {
            const chave = `${f.name}__${f.size}__${f.lastModified}`;
            const previa = previas[chave];
            const ehImagem = MIME_IMAGEM.test(f.type);
            return (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
              >
                {ehImagem && previa ? (
                  <img
                    src={previa}
                    alt={f.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                    {ehImagem ? <ImageIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{formatarTamanho(f.size)}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => remover(i)}
                  disabled={desabilitado}
                  className="h-7 w-7"
                  aria-label={`Remover ${f.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
          <li className="flex items-center justify-end gap-2 pt-1 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            {arquivos.length} arquivo(s) prontos para envio
          </li>
        </ul>
      )}
    </div>
  );
}
