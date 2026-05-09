import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TrocadorWorkspace } from "./TrocadorWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { rotuloPapel } from "@/utilitarios/traducoes";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function Cabecalho() {
  const navigate = useNavigate();
  const { workspaceAtual, limpar } = useWorkspaceStore();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const sair = async () => {
    await supabase.auth.signOut();
    limpar();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur md:gap-3 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-6" />

      <div className="min-w-0">
        <TrocadorWorkspace />
      </div>

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </Button>

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
