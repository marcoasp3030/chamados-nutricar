import { useNavigate } from "@tanstack/react-router";
import { Bell, Check, LogOut, User as UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TrocadorWorkspace } from "./TrocadorWorkspace";
import { sair as authSair, useUsuarioAtual } from "@/auth/atual";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { rotuloPapel } from "@/utilitarios/traducoes";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import {
  useMarcarNotificacaoLida,
  useNotificacoes,
} from "@/hooks/useNotificacoes";
import { cn } from "@/lib/utils";

export function Cabecalho() {
  const navigate = useNavigate();
  const { workspaceAtual, limpar } = useWorkspaceStore();
  const [email, setEmail] = useState<string>("");
  const { data: notificacoes } = useNotificacoes(workspaceAtual?.id);
  const marcar = useMarcarNotificacaoLida();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const naoLidas = useMemo(
    () => (notificacoes ?? []).filter((n) => !n.lida_em).length,
    [notificacoes],
  );

  const sair = async () => {
    await supabase.auth.signOut();
    limpar();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  };

  const abrir = (link: string | null, id: string, lida: boolean) => {
    if (!lida) marcar.mutate([id]);
    if (link) navigate({ to: link as never });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur md:gap-3 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-6" />

      <div className="min-w-0">
        <TrocadorWorkspace />
      </div>

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
              <Bell className="h-4 w-4" />
              {naoLidas > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {naoLidas > 9 ? "9+" : naoLidas}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[360px] p-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">Notificações</span>
              {naoLidas > 0 && (
                <button
                  type="button"
                  onClick={() => marcar.mutate("todas")}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Check className="h-3 w-3" /> Marcar todas
                </button>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {(notificacoes ?? []).length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Nenhuma notificação ainda.
                </p>
              ) : (
                (notificacoes ?? []).map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => abrir(n.link, n.id, !!n.lida_em)}
                    className={cn(
                      "block w-full border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-accent",
                      !n.lida_em && "bg-primary/[0.04]",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.lida_em && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n.titulo}</p>
                        {n.mensagem && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {n.mensagem}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.criado_em), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Conta">
              <UserIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium truncate">{email || "Usuário"}</div>
              {workspaceAtual && (
                <div className="text-xs text-muted-foreground truncate">
                  {rotuloPapel[workspaceAtual.papel]} · {workspaceAtual.nome}
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={sair} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
