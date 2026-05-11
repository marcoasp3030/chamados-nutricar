# Deploy na VPS

Stack: **Docker Compose** com 3 serviços — `app` (TanStack Start em Node), `db` (Postgres 16) e `caddy` (TLS automático + proxy reverso).

## 1. Provisionar a VPS (uma vez)

Numa VPS Ubuntu/Debian limpa, como root:

```bash
ssh root@SEU_IP "bash -s" < deploy/setup-vps.sh
```

Isso instala Docker, cria o usuário `deploy`, configura UFW (80/443/SSH), fail2ban e prepara `/opt/chamados` + `/data/storage`.

## 2. Subir o código

```bash
ssh deploy@SEU_IP
cd /opt/chamados
git clone SEU_REPO .
cp .env.production.example .env.production
nano .env.production   # preencha senhas, JWT_SECRET, DOMAIN, OPENAI_API_KEY etc.
```

Gere segredos fortes:

```bash
openssl rand -base64 48   # JWT_SECRET, STORAGE_URL_SECRET, POSTGRES_PASSWORD
```

Aponte o DNS do `DOMAIN` (A record) para o IP da VPS antes de subir o Caddy — ele emite o certificado Let's Encrypt automaticamente.

## 3. Migrar dados do Supabase (opcional, único)

Antes do primeiro deploy, exporte do Supabase:

```bash
# Banco — rode na sua máquina, com a connection string do Supabase
pg_dump "postgres://...supabase..." -Fc -f dump-supabase.dump
scp dump-supabase.dump deploy@SEU_IP:/tmp/

# Storage — script da Fase 4
bun run vps:migrar-storage
rsync -avz ./storage-export/ deploy@SEU_IP:/data/storage/
```

Restaure o dump no container `db` após o primeiro `up -d db`:

```bash
docker compose up -d db
cat /tmp/dump-supabase.dump | docker compose exec -T db pg_restore -U app -d app --clean --if-exists
```

E depois rode o script da Fase 2 para migrar usuários do `auth.users` para o schema próprio:

```bash
docker compose run --rm app bun run scripts/migrar-usuarios.ts
```

## 4. Deploy

```bash
bash deploy/deploy.sh
```

O script faz: build da imagem → sobe Postgres → roda `db:migrate` (Drizzle) → sobe `app` + `caddy`.

## 5. Operação

| Ação | Comando |
|------|---------|
| Logs do app | `docker compose logs -f app` |
| Logs do Caddy | `docker compose logs -f caddy` |
| Restart só do app | `docker compose restart app` |
| Atualizar (pull + rebuild) | `bash deploy/deploy.sh` |
| Backup manual | `bash deploy/backup.sh` |
| Restore | `bash deploy/restore.sh DUMP TARGZ` |
| Shell no banco | `docker compose exec db psql -U app -d app` |

### Backup automático

Adicione ao crontab do usuário `deploy`:

```cron
0 3 * * * cd /opt/chamados && bash deploy/backup.sh >> /var/log/chamados-backup.log 2>&1
```

## 6. Estrutura

```
/opt/chamados/                 # repositório
  .env.production              # segredos (NUNCA commitar)
  Dockerfile
  docker-compose.yml
  deploy/
    Caddyfile                  # TLS + proxy + SSE
    setup-vps.sh
    deploy.sh
    backup.sh
    restore.sh
/data/
  storage/                     # volume montado em /data/storage no container
/var/backups/chamados/         # dumps + tar.gz do storage
```

## 7. Variáveis obrigatórias (.env.production)

- `POSTGRES_PASSWORD`, `DATABASE_URL`
- `JWT_SECRET` (≥ 32 chars)
- `STORAGE_DIR=/data/storage`, `STORAGE_URL_SECRET` (≥ 32 chars), `APP_BASE_URL`
- `DOMAIN` (usado pelo Caddy)
- `OPENAI_API_KEY`, `VMPAY_API_KEY` (se usar)

## 8. Checklist pós-deploy

- [ ] `https://DOMAIN` carrega com cadeado verde
- [ ] Login funciona (auth próprio da Fase 2)
- [ ] Upload de anexo grava em `/data/storage` e a URL assinada abre o arquivo
- [ ] SSE: notificações em tempo real chegam (DevTools → Network → `/api/realtime/...` fica em `pending`)
- [ ] `bash deploy/backup.sh` gera dump + tar.gz
