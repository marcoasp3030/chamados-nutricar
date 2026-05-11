# Fase 8 — Remover `@supabase/supabase-js` do bundle (na VPS)

> Este passo só deve ser executado **depois** que você migrar todas as telas/hooks para usar
> os repos (Fase 3), o auth próprio (Fase 2), o storage local (Fase 4) e o realtime SSE (Fase 6).
> No preview do Lovable o Supabase continua sendo o backend ativo, então **não rode isso aqui**.

## Estado atual

- ✅ `vite.config.vps.ts` criado — preset Node, sem plugin Cloudflare.
- ✅ Scripts `build:vps` e `start:vps` no `package.json`.
- ✅ `Dockerfile` (Fase 7) já usa `bun run build:vps`.
- ⏳ `@supabase/supabase-js` continua instalado e usado por ~50 arquivos em `src/`.

## Inventário do que precisa ser substituído

Rode na VPS (ou local) para listar tudo que ainda depende do Supabase:

```bash
rg -l "@supabase/supabase-js|@/integrations/supabase" src
```

Padrões e seus substitutos:

| Antes (Supabase) | Depois (backend próprio) |
|---|---|
| `supabase.from("chamados").select(...)` | server fn que chama `chamadosRepo.listar(...)` (Fase 3) |
| `supabase.auth.signInWithPassword(...)` | `login(...)` de `src/auth/auth.functions.ts` (Fase 2) |
| `supabase.auth.getSession()` | `obterSessaoAtual()` de `src/auth/client.ts` (Fase 2) |
| `supabase.storage.from(b).upload(...)` | `storage.from(b).upload(...)` de `src/storage/client.ts` (Fase 4) |
| `supabase.channel(...).on("postgres_changes", ...)` | `realtime.canal(...).on("INSERT", ...)` de `src/realtime/client.ts` (Fase 6) |
| `supabase.functions.invoke("ia-chamado", ...)` | server fn `iaChamado(...)` de `src/lib/ia-chamado.functions.ts` (Fase 5) |

## Roteiro de migração das telas

Faça em lotes pequenos, fora do Lovable (no editor da VPS ou local com `bun run dev`
apontando para Postgres local). Sequência sugerida:

1. **Auth provider** (`src/hooks/use-auth.tsx` ou similar) → trocar para `src/auth/client.ts`.
2. **Hooks de query** (`src/hooks/use-*.ts` que chamam `supabase.from`) → criar server fns
   em `src/lib/*.functions.ts` que chamam os repos, e usar via `useServerFn` + `useQuery`.
3. **Telas de upload/anexo** → trocar `supabase.storage` por `storage` (mesma API).
4. **Notificações em tempo real** → trocar `supabase.channel` por `realtime.canal`.
5. **Chamadas de edge functions** → trocar `supabase.functions.invoke` pelas server fns
   da Fase 5.

Para cada arquivo:

```bash
# antes de migrar
rg "supabase\." src/hooks/use-chamados.ts

# depois de migrar, validar
bun run build:vps
```

## Quando todos os imports tiverem sumido

```bash
# 1) Confirmar zero imports
rg "@supabase/supabase-js|@/integrations/supabase" src
# (não deve retornar nada)

# 2) Remover dependência
bun remove @supabase/supabase-js

# 3) Remover arquivos do client Supabase
rm -rf src/integrations/supabase

# 4) Remover edge functions e config (já migradas na Fase 5)
rm -rf supabase

# 5) Build final
bun run build:vps
```

## Variáveis de ambiente que deixam de ser necessárias

Pode remover do `.env.production` (mantenha enquanto a migração não estiver completa):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY`

Ficam apenas as variáveis listadas em `.env.production.example` (Fase 7).

## Por que dois `vite.config.*`?

- `vite.config.ts` → usado pelo Lovable (preview/published em Cloudflare Workers).
  **Não mexer**, é o que mantém o preview funcionando.
- `vite.config.vps.ts` → usado pelo Docker da Fase 7 (`build:vps`). Preset Node,
  sem Workers. É o que vai pra produção na sua VPS.

Os dois coexistem sem conflito; o build de cada ambiente escolhe o seu.
