# Fase 9 — Camada de Queries de Dados (`@/dados/atual`)

Última camada antes do cutover para VPS. Abstrai todas as chamadas
`supabase.from(...)` / `supabase.rpc(...)` do frontend.

## Estrutura criada

| Arquivo | Papel |
|---|---|
| `src/dados/tipos.ts` | Interface `ClienteDados` (espelha `from`/`rpc` do Supabase). |
| `src/dados/atual.ts` | API pública: `export { db } from "./atual.adapter"`. |
| `src/dados/atual.adapter.ts` | **Modo Lovable**: `db = supabase` (preview funciona). |
| `src/dados/atual.adapter.proprio.ts` | **Modo VPS**: `@supabase/postgrest-js` apontando para o PostgREST do stack. |

## Como funciona o modo VPS

`@supabase/postgrest-js` é sub-pacote do próprio `supabase-js` — ou seja, a
API `.from().select().eq().single()` é idêntica. O adapter próprio:

1. Aponta para `${VITE_API_URL}/postgrest` (PostgREST exposto pelo Caddy/Compose da Fase 7).
2. Pega JWT do auth próprio via `GET /api/auth/token` (cookie httpOnly → token Bearer).
3. Token é cacheado em memória até 5s antes de expirar.
4. Cabeçalho `Accept-Profile: public` para selecionar schema.

Assim **nenhum call site precisa mudar** — só o cliente subjacente troca.

## Refactor executado

21 arquivos do frontend foram convertidos automaticamente:

- `supabase.from(...)` → `db.from(...)`
- `supabase.rpc(...)` → `db.rpc(...)`
- Import `import { db } from "@/dados/atual"` adicionado.
- Imports órfãos de `supabase` removidos.

Server functions (`*.functions.ts`, `*.server.ts`) **não foram tocadas** —
continuam usando `supabaseAdmin` ou o cliente injetado pelo middleware.

## Cutover (4 linhas)

```bash
cp src/auth/atual.adapter.proprio.ts      src/auth/atual.adapter.ts
cp src/storage/atual.adapter.proprio.ts   src/storage/atual.adapter.ts
cp src/realtime/atual.adapter.proprio.ts  src/realtime/atual.adapter.ts
cp src/dados/atual.adapter.proprio.ts     src/dados/atual.adapter.ts
npm run build:vps
```

## O que ainda chama Supabase direto

- `supabase.functions.invoke(...)` em 6 arquivos (Edge Functions: ia-chamado,
  vmpay-clients, criar-usuario-direto, definir-senha-usuario). Já foram
  migrados na Fase 5 para `*.functions.ts`; quando o build:vps roda, o
  preset Node ignora o `supabase-js` e essas funções são servidas pelo
  servidor próprio via `createServerFn`. Refactor cosmético dessas chamadas
  pode ser feito depois sem bloquear migração.

## Status final do sistema

| Camada | Lovable preview | VPS pronto |
|---|---|---|
| Auth | ✅ | ✅ |
| Storage | ✅ | ✅ |
| Realtime | ✅ | ✅ |
| **Queries** | **✅** | **✅** |
| Edge Functions | ✅ | ✅ (server fns) |
| Build/Docker/Caddy | — | ✅ |

**Sistema pronto para migração.** Próximo passo: provisionar a VPS, rodar
`scripts/deploy.sh`, e fazer o cutover dos 4 adapters.
