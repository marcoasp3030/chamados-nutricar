import { Building2, Settings, Sparkles, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspaceStore } from "@/estado/workspaceStore";
import { AbaIntegracaoIA } from "@/componentes/configuracoes/AbaIntegracaoIA";
import { AbaDepartamentos } from "@/componentes/configuracoes/AbaDepartamentos";
import { AbaUsuarios } from "@/componentes/configuracoes/AbaUsuarios";

export function PaginaConfiguracoes() {
  const { workspaceAtual } = useWorkspaceStore();
  if (!workspaceAtual) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajustes da empresa <span className="font-medium text-foreground">{workspaceAtual.nome}</span>.
        </p>
      </header>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">
            <Settings className="h-4 w-4" /> Geral
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="departamentos">
            <Building2 className="h-4 w-4" /> Departamentos
          </TabsTrigger>
          <TabsTrigger value="ia">
            <Sparkles className="h-4 w-4" /> Inteligência Artificial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-semibold">Dados da empresa</h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Nome</dt>
                <dd>{workspaceAtual.nome}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Identificador</dt>
                <dd className="font-mono">{workspaceAtual.slug}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Plano</dt>
                <dd>{workspaceAtual.plano}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Seu papel</dt>
                <dd>{workspaceAtual.papel}</dd>
              </div>
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <AbaUsuarios />
        </TabsContent>

        <TabsContent value="departamentos" className="mt-6">
          <AbaDepartamentos />
        </TabsContent>

        <TabsContent value="ia" className="mt-6">
          <AbaIntegracaoIA />
        </TabsContent>
      </Tabs>
    </div>
  );
}
