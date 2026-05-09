import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Menu, User as UserIcon } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TrocadorWorkspace } from "./TrocadorWorkspace";
import { MenuNavegacao } from "./MenuNavegacao";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { rotuloPapel } from "@/utilitarios/traducoes";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import logo from "@/assets/nutricar-logo.png";

export function Cabecalho() {
  const navigate = useNavigate();
  const { workspaceAtual, limpar } = useWorkspaceStore();
  const [email, setEmail] = useState<string>("");
  const [menuAberto, setMenuAberto] = useState(false);

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
    <header className="flex h-16 items-center gap-2 border-b border-border bg-card px-3 md:gap-4 md:px-6">
      {/* Mobile: hamburger + logo */}
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="h-16 flex-row items-center border-b border-border px-5 space-y-0">
            <SheetTitle className="flex items-center">
              <img src={logo} alt="Nutricar" className="h-8 w-auto" />
            </SheetTitle>
          </SheetHeader>
          <div className="px-3 pt-3">
            <TrocadorWorkspace />
          </div>
          <MenuNavegacao aoNavegar={() => setMenuAberto(false)} />
          {workspaceAtual && (
            <div className="border-t border-border p-4 text-xs text-muted-foreground">
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full"
                style={{ background: workspaceAtual.cor_primaria }}
              />
              {workspaceAtual.plano}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <img src={logo} alt="Nutricar" className="h-7 w-auto md:hidden" />

      <div className="hidden md:block">
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
