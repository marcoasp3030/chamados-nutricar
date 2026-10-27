# Últimas modificações — chamados-nutricar

## 24/09/2026 — Seletor de loja organizado por Locais VMPay

**Tela:** Novo chamado (`/w/$slug/chamados/novo`) — campo Loja.

**Comportamento:**
- Se a VMPay retornar locais (`GET /api/v1/locations`), o seletor agrupa por **cidade (UF)** e mostra endereço (bairro · cidade/UF · rua).
- Busca por nome, cidade, bairro ou rua.
- Clientes sem local correspondente aparecem em “Outras lojas (sem endereço)”.
- Se não houver locais, mantém a lista alfabética de clientes (como antes).

**Deploy:** imagem `chamados-nutricar:latest` + `chamados_chamados_app` atualizado.

---

## 14/07/2026 — Fix RLS: Gestor salvar departamentos do membro

**Sintoma:** ao salvar usuário/departamentos: `Não foi possível salvar.` / `new row violates row-level security policy for table "workspace_membro_departamentos"`.

**Causa:** a tela e a API já permitem **Gestor** gerenciar usuários, mas as policies `wmd_inserir` / `wmd_excluir` / `wmd_atualizar` e `membros_atualizar_admins` só aceitavam Proprietário e Administrador.

**Correção:**
- `scripts/db-init/26-wmd-rls-gestor.sql` — inclui **Gestor** nas policies
- Aplicado no Postgres da VPS (não exige rebuild da imagem)

**Teste:** INSERT em `workspace_membro_departamentos` com JWT de `marco.antonio@...` (papel Gestor) → OK.

---

## 21/05/2026 — Atualização GitHub (módulo Inventário + VMPay)

**Origem:** pull `origin/main` (`20f6969` → `70375bf`, 37 commits).

**Novidades integradas:**
- **Inventário** — rota `/w/$slug/inventario`, `PaginaInventario.tsx`, `useInventario.ts` (itens, movimentações, compartilhamento entre departamentos, gráficos).
- **Menu lateral** — link Inventário (`AppSidebar`).
- **VMPay** — `useLojasVMPay` com mais campos da loja; ajuste em `vmpay-clients`.
- Migration `20260521142933` — tabelas `inventario_itens`, `inventario_movimentacoes`, `inventario_compartilhamentos` + RLS + triggers.

**Preservados (VPS):** auth/PostgREST, `/api/admin/usuarios/*`, RLS chamados/dept, deploy Swarm, fixes anteriores.

**Banco:** `scripts/db-init/12-inventario.sql` aplicado em produção.

**Deploy:** `deploy/deploy-swarm.sh` executado.

## 20/05/2026 — Atualização GitHub (visibilidade por departamento)

**Origem:** pull `origin/main` (`62afdd3` → `20f6969`, 4 commits).

**Novidade:**
- Migration `20260520151632` — RLS `chamados_selecionar` e `chamados_atualizar` restritas por departamento:
  - **Proprietário/Administrador:** veem todos os chamados do workspace.
  - **Demais:** só chamados em que são **solicitante** ou o `departamento_id` está nos departamentos do usuário.
  - Gestor/Atendente deixam de ver tudo automaticamente (só via dept ou se forem solicitantes).

**VPS:**
- `scripts/db-init/11-chamados-visibilidade-depto.sql` criado e aplicado no Postgres.
- Fixes anteriores preservados (auth, admin usuários, dept RLS, etc.).
- Deploy Swarm executado.

## 20/05/2026 — Atualização GitHub (edição de perfil de membros)

**Origem:** pull `origin/main` (`ab3a1c7` → `62afdd3`, 6 commits).

**Novidades integradas:**
- `AbaUsuarios.tsx` — ao editar membro, permite alterar **nível de acesso** (papel); Proprietário não pode ser rebaixado nem promovido.

**Preservados (VPS):** auth/PostgREST, APIs `/api/admin/usuarios/*`, RLS fixes, Gestor pode criar usuários, deploy Swarm, `podeGerenciarUsuarios`.

**Banco:** sem migration nova neste pull.

**Deploy:** `deploy/deploy-swarm.sh` — `chamados_chamados_app` + `chamados_postgrest` atualizados.

## 20/05/2026 — Criar usuário: “Sem permissão” (Gestor)

**Problema:** ao criar usuário, toast `Sem permissão` mesmo logado no workspace.

**Causa:** API só aceitava **Proprietário** e **Administrador**; usuários **Gestor** (ex.: `marco.antonio@...`) viam o botão mas eram bloqueados no servidor.

**Correções:**
- `admin-usuarios.server.ts`: `exigirGerenciarUsuarios` — Proprietário, Administrador, **Gestor** ou `super_admin`.
- `AbaUsuarios.tsx`: botão “Novo usuário” e edição/senha só para quem pode gerenciar; inativar/remover continua só Prop/Admin.

**Deploy:** rebuild após alteração.

## 20/05/2026 — Criar usuário / definir senha não funcionava

**Problema:** ao criar usuário ou definir senha, a ação falhava; às vezes pedia senha mas não salvava.

**Causas:**
1. `criarUsuarioDireto` e `definirSenhaUsuario` usavam `createServerFn` (`/_serverFn/`), instável na VPS (mesmo problema do login).
2. E-mail já cadastrado reativava o membro **sem** atualizar `senha_hash` — senha temporária exibida não funcionava no login.
3. Validação Zod de `senha: null` (gerar automática) podia falhar no server function.

**Correções:**
- Rotas HTTP: `POST /api/admin/usuarios/criar` e `POST /api/admin/usuarios/definir-senha` (cookies + Drizzle).
- `admin-usuarios.functions.ts` passou a usar `fetch` com `credentials: "include"`.
- `criarUsuarioDireto`: ao reutilizar e-mail existente, grava a nova senha temporária.
- `exigirPapel` lança `Proibido` com mensagem legível.

**Deploy:** rebuild + `chamados_chamados_app` após alteração.

## 20/05/2026 — Erro RLS ao criar departamento

**Problema:** salvar departamento em Configurações falhava com `violates row-level security policy for table "departamentos"`.

**Causas:**
1. Policy `departamentos_inserir` só permitia **Proprietário** e **Administrador** (usuários **Gestor** eram bloqueados).
2. Exigência `criado_por = auth.uid()` no WITH CHECK podia falhar se o id do cliente não coincidisse com o JWT.

**Correções:**
- `scripts/db-init/10-departamentos-rls.sql` — Gestor incluído em inserir/atualizar/excluir; trigger `preencher_criado_por()` define `criado_por` pelo JWT.
- Mesmas regras aplicadas em **categorias_chamado** (preventivo).
- SQL aplicado em produção.

**Teste validado:** INSERT com RETURNING como Gestor (`marco.antonio@...`) → OK.

## 20/05/2026 — Atualização GitHub (funis Kanban + edição/exclusão)

**Origem:** pull `origin/main` (`f7b8dda` → `ab3a1c7`, 13 commits).

**Novidades integradas:**
- `GerenciadorFunis.tsx` + `useFunisKanban.ts` — funis personalizados no quadro Kanban (status ou filtro).
- `CartaoChamadoComPrevia.tsx` — cartão com prévia no quadro.
- `QuadroChamados.tsx` e `DetalheChamado.tsx` — melhorias de edição, exclusão e transição de status.
- Migration `20260520015743` — tabela `kanban_funis` + RLS.

**Preservados (VPS):** auth própria, PostgREST, `/api/workspaces/me`, adapters, fix RLS `chamados_selecionar` (`08-chamados-rls-selecionar.sql`), deploy Swarm.

**Banco:**
- `scripts/db-init/09-kanban-funis.sql` criado e aplicado em produção.

**Deploy:** `deploy/deploy-swarm.sh` — imagem rebuild + `chamados_chamados_app` e `chamados_postgrest` atualizados.

## 20/05/2026 — Erro RLS ao criar/abrir chamado

**Problema:** criar chamado retornava `new row violates row-level security policy for table "chamados"`; listagem e detalhe também falhavam.

**Causa:** a policy `chamados_selecionar` (SELECT) estava **ausente** no Postgres. O script `02-rls-e-funcoes.sql` (gerado/truncado) fazia `DROP` sem recriar a policy. INSERT até funcionava, mas o PostgREST usa `RETURNING` após insert — isso exige SELECT e falhava com a mesma mensagem de RLS.

**Correções:**
- `scripts/db-init/08-chamados-rls-selecionar.sql` — recria `chamados_selecionar` (Gestor/Atendente + departamentos + solicitante/criador/responsável).
- `supabase/migrations/20260520120000_restaurar_chamados_selecionar_rls.sql` — mesma policy para histórico de migrations.
- SQL aplicado em produção no Postgres Swarm.

**Teste validado:** INSERT com `RETURNING` e `SELECT count(*)` como role `authenticated` com JWT simulado → OK.

## 19/05/2026 — Correção do login (spinner infinito)

**Problema:** botão "Entrar" ficava carregando sem abrir o sistema.

**Causas e correções:**
1. **Build SSR com shim Cloudflare** — driver `postgres` bundlado com `cloudflare:sockets`, quebrando `/api/auth/login` (HTTP 500).
   - `vite.config.vps.ts`: `cloudflare: false` + `ssr.external` para `postgres`, `drizzle-orm`, `bcryptjs`, `jose`.
2. **Entrypoint errado após build** — saída passou a ser `dist/server/server.js` (não `index.js`).
   - Atualizado `Dockerfile` e `package.json` (`start:vps`).
3. **PostgREST sem embed de workspace** — faltavam FKs em `workspace_membros`.
   - SQL `scripts/db-init/03-fks-postgrest.sql` aplicado na VPS.
4. **JWT sem role PostgREST** — token não tinha `role: authenticated`, RLS falhava após login.
   - `src/auth/jwt.server.ts`: claim `role: "authenticated"` no access token.

**Deploy:** imagem `chamados-nutricar:latest` rebuildada e serviço `chamados_chamados_app` atualizado.

**Teste validado:** login `ti@nutricarbrasil.com.br` → cookies `nut_access`/`nut_refresh` → query `workspace_membros` retorna `nutricar` → redirect para `/w/nutricar/painel`.

## 19/05/2026 — Painel carregando infinito (pós-login)

**Problema:** login funcionava, mas painel/workspace ficava no spinner sem mostrar dados.

**Causas e correções:**
1. **JWT antigo sem `role: authenticated`** — `/api/auth/token` reutilizava cookie velho; PostgREST caía em RLS (401).
   - `api/auth/token.ts`: regenera access token se faltar `role`.
2. **Spinner eterno em erro** — painel usava `isLoading || !data` (erro = loading infinito).
   - `w.$slug.painel.tsx`: estado de erro + botão "Tentar novamente".
3. **Layout do workspace** — `useEffect` podia cancelar `setCarregando(false)`; fetch sem tratamento.
   - `w.$slug.tsx` + `index.tsx`: `try/catch/finally`, deps só `[slug]`.
4. **Cache de token no browser** — limpa cache em 401; deduplica fetch paralelo de `/api/auth/token`.
   - `dados/atual.adapter.ts`.
5. **Bug logout** em `SelecionarWorkspace.tsx` (recursão infinita no `sair`).

**Deploy:** `chamados_chamados_app` atualizado em produção.

## 19/05/2026 — "Nenhuma empresa vinculada" na seleção

**Problema:** após login, tela `/selecionar-empresa` mostrava vazio mesmo com workspace no banco.

**Causa:** `useMeusWorkspaces` rodava no SSR (sem cookies httpOnly) e cacheava lista vazia no React Query.

**Correções:**
- `useMeusWorkspaces.ts`: busca só no browser, após `obterSessao()` (cookies disponíveis).
- `SelecionarWorkspace.tsx`: redirect automático quando há 1 empresa; estado de erro com retry.
- `scripts/db-init/04-seed-nutricar.sql`: seed idempotente **Nutricar Brasil** (`slug: nutricar`) + vínculo **Proprietario** para `ti@nutricarbrasil.com.br`.

**Atualização:** erro persistiu porque PostgREST no browser ainda falhava (token JWT). Criada rota **`GET /api/workspaces/me`** (Drizzle + cookies no servidor). `useMeusWorkspaces`, `index.tsx` e `w.$slug.tsx` passaram a usar essa API.

## 19/05/2026 — Erro ao salvar (Invalid URL) + lentidão

**Problema:** criar/editar registros falhava com `Failed to construct 'URL': Invalid URL`; consultas lentas.

**Causa:** `PostgrestClient` usava URL relativa (`/api/postgrest`). Ao chamar `.from('tabela')`, a lib faz `new URL('/api/postgrest/tabela')` sem base — lança exceção no browser.

**Correções:**
- `dados/atual.adapter.ts`: URL absoluta via `window.location.origin`; cliente lazy; cache de token estendido; `preaquecerTokenPostgrest()` após login.
- Deploy em produção.

## 19/05/2026 — Erro ao criar usuário (cargo inválido)

**Problema:** criar usuário falhava no insert em `workspace_membros` com cargo `Gerente`.

**Causa:** banco tinha enum `cargo_membro` (TI, Compras…) do Drizzle inicial, mas o app usa `cargo_workspace` (Funcionario, Supervisor, Gestor, Gerente).

**Correções:**
- SQL `scripts/db-init/05-cargo-workspace.sql`: colunas `cargo` migradas para `cargo_workspace`.
- `src/db/schema.ts`: enum alinhado ao app.
- Usuário `marco.antonio@nutricarbrasil.com.br` vinculado ao workspace como Gestor/Gerente.

## 19/05/2026 — Erro ao salvar cargo (cache PostgREST)

**Problema:** salvar/editar cargo em usuários retornava `column "cargo" is of type cargo_workspace but expression is of type cargo_membro`.

**Causa:** coluna já migrada para `cargo_workspace`, mas o **PostgREST** ainda cacheava o tipo antigo `cargo_membro` (serviço não reiniciado após migração SQL).

**Correções:**
- Reinício do serviço `chamados_postgrest` (`docker service update --force chamados_postgrest`).
- Script `05-cargo-workspace.sql`: `DROP TYPE cargo_membro` + comentário para reiniciar PostgREST após ALTER TYPE.

**Teste validado:** PATCH em `workspace_membros` com `cargo: Gerente` → HTTP 204.

## 19/05/2026 — Erro ao criar chamado (tipo_chamado inválido)

**Problema:** criar chamado com tipo **Dúvida** falhava: `invalid input value for enum tipo_chamado: "Duvida"`.

**Causa:** banco tinha enum legado do Drizzle (`Solicitacao`, `Incidente`, `Problema`, `Mudanca`); o app envia `Duvida`, `Melhoria`, `Bug`.

**Correções:**
- SQL `scripts/db-init/06-tipo-chamado.sql`: recria enum `tipo_chamado` com valores do app; mapeia `Problema`→`Bug`, `Mudanca`→`Melhoria`.
- `src/db/schema.ts`: enum `tipoChamado` alinhado.
- Reinício do PostgREST após migração.

**Teste validado:** POST em `chamados` com `tipo: Duvida` → HTTP 201.

## 19/05/2026 — Usuário superadmin inicial (TI)

- Criado usuário **`ti@nutricarbrasil.com.br`** com `super_admin = true` na tabela `perfis`.
- Criado workspace **Nutricar Brasil** (`slug: nutricar`) e vínculo como **Proprietario** em `workspace_membros`.
- Após login, o app redireciona para `/w/nutricar/painel`.

## 19/05/2026 — Cutover Supabase Cloud → Postgres próprio (VPS)

- **Objetivo:** parar de usar Supabase Cloud (`aqsohuerdaxojevvrumj.supabase.co`) e rodar só com Postgres Swarm + auth/storage/realtime próprios.
- **Adapters ativados:** `auth/atual.adapter.ts`, `dados/atual.adapter.ts`, `storage/atual.adapter.ts`, `realtime/atual.adapter.ts` (modo VPS).
- **Infra nova:**
  - Serviço Swarm `chamados_postgrest` (PostgREST v12) na rede `network_swarm_public`.
  - Rotas `/api/auth/token`, `/api/postgrest/*` (proxy), `/api/health`.
  - SQL `scripts/db-init/01-postgrest-roles.sql` + `02-rls-e-funcoes.sql`; migrations Supabase aplicadas para RLS (~95 policies).
- **Deploy:** `deploy/deploy-swarm.sh` rebuilda sem `VITE_SUPABASE_*`; `deploy/.env.swarm` usa `POSTGREST_DB_URI` + `POSTGREST_AUTH_PASSWORD`.
- **Frontend:** chamadas `supabase.functions.invoke` trocadas por server functions (`acaoIaChamado`, `listarClientesVmpayFn`, `criarUsuarioDireto`, `definirSenhaUsuario`); `uazapi.functions` usa `requireAuth` próprio.
- **Scripts de dados:** `scripts/exportar-dados-supabase.ts` + `scripts/importar-dados-supabase.ts` + `scripts/migrar-usuarios.ts`.
- **Pendente:** exportar dados do Supabase (precisa `SUPABASE_SERVICE_ROLE_KEY` no `.env.swarm`) e rodar import + migrar usuários. Postgres VPS ainda com tabelas vazias até essa etapa.

## 19/05/2026 — Página principal: “This page didn't load”

## 20/05/2026 — Atualização GitHub + preservação fixes VPS

**Origem:** pull de `origin/main` (31 commits) — árvore de chamados no painel, categorias vinculadas a departamentos, cache de assets, `VPS.md`, etc.

**Processo:**
1. Stash dos ajustes locais VPS → `git pull` → stash pop (auto-merge sem conflitos).
2. Novidades integradas: `ArvoreChamadosInterativa`, `useArvoreChamados`, `AbaCategorias` com dept, `FormularioChamado` atualizado.
3. **Preservados** todos os fixes VPS: auth própria, PostgREST, `/api/workspaces/me`, adapters, enums (`cargo_workspace`, `tipo_chamado`), deploy Swarm.
4. SQL `scripts/db-init/07-categorias-departamento.sql` aplicado + `departamento_id` no `schema.ts`.
5. `deploy-swarm.sh`: passa a rodar scripts `db-init/03+` em cada deploy.
6. Rebuild + deploy `chamados_chamados_app` + restart `chamados_postgrest`.

**Teste validado:** `/api/health` OK, login TI OK, enums `cargo_workspace`/`tipo_chamado` intactos, coluna `departamento_id` em `categorias_chamado`.
