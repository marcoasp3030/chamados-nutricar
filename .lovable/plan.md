## Objetivo

Remover toda dependência do Supabase e deixar o sistema rodando na sua VPS com **Postgres + app Node em Docker**. O app continua funcionando exatamente como hoje — só muda o backend por baixo.

## Por que em fases

São ~30 arquivos no frontend que chamam `supabase.*`, ~25 tabelas com policies RLS, 4 edge functions, 1 bucket de storage e o build target inteiro precisa mudar de Cloudflare Workers para Node. Fazer tudo num commit gigante quebra o app em produção e fica impossível debugar. Vamos por camadas, validando cada uma.

---

## Fase 1 — Camada de acesso e build (base de tudo)

Sem isso nada funciona na VPS.

1. **Trocar build target para Node** em `vite.config.ts` (preset `node-server` do TanStack Start) — gera `.output/server/index.mjs` que o Dockerfile espera.
2. **Criar `src/db/`** com cliente Postgres (`postgres-js` ou `pg`) + helpers de query e transação. Lê `DATABASE_URL` do env.
3. **Criar `src/db/schema.ts`** com Drizzle ORM (tipado, gera migrations) — espelha as tabelas atuais.
4. **Servidor de migrations** — script `bun run db:migrate` que roda no boot do container.

## Fase 2 — Autenticação própria

Substituir `supabase.auth.*` por auth próprio.

1. **Tabela `usuarios`** com `email`, `senha_hash` (bcrypt), `email_verificado`, `criado_em`. Migração inclui copiar IDs de `perfis.id` (preserva todas as relações existentes).
2. **Lib de auth**: JWT (HS256) assinado com `JWT_SECRET`, cookie `httpOnly` `Secure`, refresh token rotativo.
3. **Server functions**: `signIn`, `signUp`, `signOut`, `resetPassword`, `getSession`.
4. **Middleware `requireAuth`** equivalente ao atual `requireSupabaseAuth` — injeta `userId` no contexto da server fn.
5. **Cliente browser** `src/auth/client.ts` com API parecida (`signInWithPassword`, `onAuthStateChange`) para minimizar mudanças nas telas.
6. **Reescrever**: `login.tsx`, telas de "definir senha" e "convite", `useAuth`, qualquer hook que chame `supabase.auth`.

## Fase 3 — Autorização (substituir RLS)

Decisão: **mover toda a autorização para o backend Node** (mais seguro e simples de debugar do que tentar reproduzir RLS sem GoTrue).

1. **Repositório por entidade** (`src/repos/chamados.ts`, `src/repos/checklists.ts`, etc.) — todo SELECT/INSERT/UPDATE/DELETE passa por aqui.
2. Cada função do repo recebe `{ userId, workspaceId }` e aplica as mesmas regras das policies atuais (consultando `workspace_membros`, `tem_papel_workspace`, `pode_ver_todos_chamados` reescritos como funções TypeScript).
3. **Server functions** (`*.functions.ts`) chamam os repos — nenhuma chamada direta de SQL fica em route/loader/componente.
4. **Frontend**: trocar `supabase.from('x').select()` por `useServerFn(getX)` em ~30 arquivos.

## Fase 4 — Storage de arquivos

1. **Volume Docker** `/data/storage` (já no compose).
2. **Server route `/api/storage/upload`** com auth obrigatório, valida workspace/chamado, grava em `/data/storage/<workspace_id>/<chamado_id>/<uuid>-<nome>`.
3. **Server route `/api/storage/download/$path`** com auth + verificação de permissão (mesma lógica das policies do bucket).
4. Reescrever: `NovoChamado.tsx`, `AnexosChamado.tsx`, `SeletorAnexos.tsx`, `FormularioChamado.tsx`.
5. Script de import: copia `storage/chamado-anexos/` (já exportado) para o volume na primeira subida.

## Fase 5 — Edge Functions → server routes

Migrar para `src/routes/api/...`:
- `ia-chamado` → `src/routes/api/ia/chamado.ts` (já tem padrão, usa Lovable AI)
- `criar-usuario-direto` → server fn `criarUsuario` (admin only)
- `definir-senha-usuario` → server fn `definirSenha`
- `vmpay-clients` → `src/routes/api/vmpay/clients.ts`
- `whatsapp-notify` já está em server route ✅

## Fase 6 — Triggers e funções de banco

Reescrever em TypeScript dentro dos repositórios (mais fácil de versionar e testar):
- `gerar_numero_chamado`, `gerar_codigo_chamado` → no repo de chamados antes do INSERT
- `registrar_historico_chamado/comentario` → no repo, dentro da mesma transação
- `disparar_whatsapp_chamado` → chama o webhook diretamente do server fn
- `validar_transicao_status_chamado` → validação Zod + checagens no repo

Mantém no Postgres apenas: `atualizar_coluna_atualizado_em` (trigger simples) e os enums.

## Fase 7 — Realtime (se for necessário)

Buscar usos de `supabase.channel(...)` no projeto. Se houver:
- Adicionar `socket.io` ao app, emitir eventos do servidor após cada write.
- Se realtime não for crítico, remover e usar polling (`refetchInterval` no React Query).

## Fase 8 — Limpeza e deploy

1. Remover `@supabase/supabase-js` do `package.json`.
2. Remover `src/integrations/supabase/`, `supabase/` (pasta toda).
3. Atualizar `.env.example` final.
4. Documentar deploy: `docker compose up -d --build` + `bun run db:migrate` + import de storage.
5. Smoke test: criar usuário, login, criar chamado, anexar arquivo, comentar, mudar status.

---

## Detalhes técnicos

**Stack escolhida (justificativa):**
- **Drizzle ORM** — tipado, migrations versionadas, queries SQL-like, sem runtime overhead
- **postgres-js** — driver Postgres mais rápido, suporta prepared statements
- **bcryptjs** — hash de senhas (puro JS, funciona em Node sem dependência nativa)
- **jose** — JWT (HS256), API moderna
- **zod** — validação (já no projeto)

**Variáveis de ambiente novas:**
```
DATABASE_URL=postgres://user:pass@postgres:5432/chamados
JWT_SECRET=<openssl rand -base64 48>
STORAGE_DIR=/data/storage
APP_BASE_URL=https://chamados.suaempresa.com.br
```

**Mapeamento `auth.uid()` → contexto da server fn:**
- Hoje: RLS chama `auth.uid()` automaticamente.
- Depois: cada server fn recebe `userId` do middleware `requireAuth` e passa explicitamente para o repo.

**Preservação dos dados:**
- IDs de `perfis` viram IDs de `usuarios` 1:1 (sem alterar UUIDs existentes).
- Senhas: usuários terão de redefinir no primeiro login (não temos os hashes do GoTrue) — ou enviar email de "definir nova senha" em massa.

---

## Estimativa por fase

| Fase | Esforço |
|------|---------|
| 1 — Build + DB layer | 1 dia |
| 2 — Auth | 2 dias |
| 3 — Autorização nos repos | 3-4 dias |
| 4 — Storage | 1 dia |
| 5 — Edge Functions | 1 dia |
| 6 — Triggers em TS | 1 dia |
| 7 — Realtime | 0,5-2 dias |
| 8 — Limpeza | 0,5 dia |
| **Total** | **~10-13 dias** |

## Como vamos trabalhar

Cada fase = 1 mensagem sua aprovando + 1 entrega minha. Você testa entre fases para garantir que nada quebrou. Se parar no meio, o que já estiver feito continua funcionando (a Fase 1-2 já permite rodar local com Postgres mesmo antes de remover tudo do Supabase).

**Aprovo este plano e começo pela Fase 1?**
