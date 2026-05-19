# 🚀 Deploy na VPS — Guia Único

Tudo que você precisa para subir o **chamados-nutricar** numa VPS Ubuntu/Debian limpa, com Docker + Postgres + Caddy (HTTPS automático).

**Domínio:** `nutricarhub.nutricarbrasil.com.br`
**Repo:** `https://github.com/marcoasp3030/chamados-nutricar.git`

---

## 0. Pré-requisitos

- VPS Ubuntu 22.04+ ou Debian 12+ (mínimo 2 vCPU / 4 GB RAM / 40 GB SSD)
- Acesso `root` via SSH
- DNS apontando: registro **A** `nutricarhub.nutricarbrasil.com.br` → IP da VPS
- Portas 22, 80 e 443 liberadas no provedor

---

## 1. Provisionar a VPS (uma única vez)

Do seu computador local:

```bash
ssh root@SEU_IP_DA_VPS "bash -s" < deploy/setup-vps.sh
```

Isso instala: Docker + Compose, UFW, fail2ban, cria usuário `deploy`, libera 80/443/SSH.

---

## 2. Clonar o repositório

```bash
ssh root@SEU_IP_DA_VPS
su - deploy
cd /opt/chamados
git clone https://github.com/marcoasp3030/chamados-nutricar.git .
```

---

## 3. Criar `.env.production`

```bash
cd /opt/chamados
cp .env.production.example .env.production
nano .env.production
```

Cole o conteúdo abaixo (gere `JWT_SECRET` e `STORAGE_URL_SECRET` com `openssl rand -base64 48`):

```env
# Banco
POSTGRES_PASSWORD=pd2V7VA2phVQBfxQ
DATABASE_URL=postgres://app:pd2V7VA2phVQBfxQ@db:5432/app

# Auth
JWT_SECRET=COLE_AQUI_openssl_rand_base64_48
SESSION_COOKIE_NAME=chamados_session
SESSION_TTL_DIAS=30

# Storage local
STORAGE_DIR=/data/storage
STORAGE_URL_SECRET=COLE_AQUI_outro_openssl_rand_base64_48
APP_BASE_URL=https://nutricarhub.nutricarbrasil.com.br

# Domínio (Caddy usa para emitir TLS)
DOMAIN=nutricarhub.nutricarbrasil.com.br

# Integrações (preencha se for usar)
OPENAI_API_KEY=
VMPAY_API_KEY=
LOVABLE_API_KEY=
```

---

## 4. ATIVAR os adapters próprios (substitui Supabase)

Esses 4 comandos trocam o app de Supabase → backend próprio (auth + DB + storage + realtime). **Só rode na VPS**, nunca no preview Lovable.

```bash
cd /opt/chamados
cp src/auth/atual.adapter.proprio.ts     src/auth/atual.adapter.ts
cp src/dados/atual.adapter.proprio.ts    src/dados/atual.adapter.ts
cp src/storage/atual.adapter.proprio.ts  src/storage/atual.adapter.ts
cp src/realtime/atual.adapter.proprio.ts src/realtime/atual.adapter.ts
```

---

## 5. Subir a stack

```bash
bash deploy/deploy.sh
```

Esse script:
1. Builda a imagem Docker do app
2. Sobe o Postgres e espera ficar healthy
3. Roda as migrations Drizzle (`scripts/migrate.ts`)
4. Sobe o app + Caddy (que pega TLS Let's Encrypt automaticamente)

---

## 6. (Opcional) Importar dados do Supabase atual

Se você já tem dados no Supabase de produção e quer trazer:

```bash
# 6.1 — Restaurar schema + dados do dump (você precisa ter os arquivos .sql)
bash deploy/restore.sh caminho/para/02-dados.sql

# 6.2 — Popular tabela `usuarios` a partir de `perfis`
docker compose exec app bun run scripts/migrar-usuarios.ts

# 6.3 — Baixar storage do Supabase e subir no /data/storage local
docker compose exec app bun run scripts/migrar-storage.ts
```

> ⚠️ Após `migrar-usuarios.ts`, **todos os usuários precisam usar "Esqueci minha senha" no 1º login** (não temos os hashes originais do Supabase Auth).

---

## 7. Verificações de sanidade

```bash
# Stack está de pé?
docker compose ps

# Healthcheck do app
curl -I https://nutricarhub.nutricarbrasil.com.br/

# Postgres aceitando conexão?
docker compose exec db pg_isready -U app -d app

# Logs em tempo real
docker compose logs -f app
docker compose logs -f caddy
```

Smoke test no navegador:
- [ ] Página de login carrega via HTTPS
- [ ] Criar conta + login funciona
- [ ] Criar um chamado funciona
- [ ] Upload de anexo funciona
- [ ] Painel atualiza em tempo real (SSE)

---

## 8. Backup automático (recomendado)

Crie um cron como `deploy` user:

```bash
crontab -e
# Adicione:
0 3 * * * cd /opt/chamados && bash deploy/backup.sh >> /var/log/chamados-backup.log 2>&1
```

Isso roda `deploy/backup.sh` toda madrugada às 03:00 e gera dump em `/opt/chamados/backups/`.

---

## 9. Atualizações futuras

Para deploy de novas versões:

```bash
cd /opt/chamados
git pull
bash deploy/deploy.sh
```

Para forçar rebuild total (após mudança de deps):

```bash
docker compose build --no-cache app
docker compose up -d app
```

---

## 10. Rollback (se algo der errado)

```bash
cd /opt/chamados
git log --oneline -10                    # ver últimos commits
git checkout <hash-do-commit-anterior>
docker compose build app
docker compose up -d app

# Se precisar restaurar banco:
bash deploy/restore.sh backups/dump-AAAA-MM-DD.sql
```

---

## 📂 Mapa dos arquivos

| Arquivo | O que faz |
|---|---|
| `Dockerfile` | Build multi-stage Bun→Node |
| `docker-compose.yml` | App + Postgres 16 + Caddy + volumes |
| `deploy/Caddyfile` | Reverse proxy + HTTPS auto + SSE + cache |
| `deploy/setup-vps.sh` | Provisionamento inicial (1x) |
| `deploy/deploy.sh` | Build + migrate + up |
| `deploy/backup.sh` / `restore.sh` | Dump / restore Postgres |
| `.env.production` | **Secrets — NÃO commitar** |
| `vite.config.vps.ts` | Build preset Node (sem Cloudflare) |
| `src/db/schema.ts` | Schema Drizzle |
| `scripts/migrate.ts` | Aplica migrations |
| `scripts/migrar-usuarios.ts` | Popula auth próprio a partir de `perfis` |
| `scripts/migrar-storage.ts` | Move anexos Supabase → disco local |

---

## 🆘 Problemas comuns

**Caddy não pega HTTPS**
→ Confira DNS (`dig nutricarhub.nutricarbrasil.com.br`), portas 80/443 abertas, e logs: `docker compose logs caddy`.

**404 em `/assets/*.js` após deploy**
→ Cache antigo. `docker compose restart caddy` + Ctrl+Shift+R no navegador.

**App sobe mas dá 500**
→ `docker compose logs app` — geralmente é `DATABASE_URL` errado ou migration não rodou.

**Postgres não inicia**
→ Permissões do volume: `docker compose down && docker volume rm chamados_db_data && bash deploy/deploy.sh` (⚠️ apaga dados!).

**Esqueci de rodar o swap dos adapters (passo 4)**
→ App vai tentar conectar no Supabase e quebrar. Rode os 4 `cp`, depois `docker compose build --no-cache app && docker compose up -d app`.
