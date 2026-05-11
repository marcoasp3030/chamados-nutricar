# Runbook — Cutover Lovable Cloud → VPS própria

> **Objetivo**: migrar o sistema do backend Supabase (Lovable Cloud) para uma
> VPS auto-hospedada com Postgres + PostgREST + MinIO + Node, **sem perda de
> dados e com janela de indisponibilidade < 15 min**.
>
> **Pré-requisito**: Fases 1–9 concluídas (camadas abstratas + adapters
> próprios + scripts de deploy).

---

## 0. Visão geral da janela

```
T-7d  → Provisionamento da VPS (sem impacto)
T-3d  → Dry-run completo em staging (sem impacto)
T-1d  → Comunicar usuários sobre janela
T-0   → CUTOVER (≈10–15 min de read-only)
T+1h  → Monitoramento intensivo
T+24h → Encerrar plano de rollback
```

---

## 1. Pré-requisitos (T-7 dias)

### 1.1. Infraestrutura

- [ ] VPS provisionada: **Ubuntu 22.04 LTS**, mín. **4 vCPU / 8 GB RAM / 80 GB SSD**
- [ ] DNS apontando: `app.seudominio.com.br` → IP da VPS (TTL 300s)
- [ ] Portas abertas no firewall: **80, 443** (Caddy faz TLS automático)
- [ ] Acesso SSH por chave (root desabilitado, usuário `deploy` no grupo `docker`)
- [ ] Backup snapshot da VPS habilitado no provedor (Hetzner/DigitalOcean/etc.)

### 1.2. Segredos coletados

Coletar e ter à mão (NÃO commitar):

```bash
# Banco
POSTGRES_PASSWORD=<gerar 32 chars>
JWT_SECRET=<gerar 64 chars — openssl rand -hex 32>

# Storage
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=<gerar 32 chars>

# Integrações
LOVABLE_API_KEY=<copiar do projeto Lovable>
UAZAPI_TOKEN=<se aplicável>
VMPAY_API_KEY=<se aplicável>

# Domínio
DOMINIO=app.seudominio.com.br
EMAIL_ADMIN=admin@seudominio.com.br  # para Let's Encrypt
```

### 1.3. Dump de teste do Supabase

```bash
# Pegar URL de conexão no painel do Supabase → Project Settings → Database
export SUPABASE_DB_URL="postgresql://postgres:SENHA@db.PROJ.supabase.co:5432/postgres"

# Dump completo (schema + dados) — só para testar tamanho/duração
pg_dump "$SUPABASE_DB_URL" \
  --no-owner --no-acl \
  --schema=public \
  --file=/tmp/dump-teste.sql

ls -lh /tmp/dump-teste.sql  # anotar tamanho
```

---

## 2. Provisionamento da VPS (T-7 a T-3 dias)

### 2.1. Subir o stack

```bash
ssh deploy@VPS_IP
sudo mkdir -p /opt/app && sudo chown deploy:deploy /opt/app
cd /opt/app
git clone https://github.com/SUA_ORG/SEU_REPO.git .
git checkout main

# Criar .env a partir do template
cp deploy/.env.exemplo .env
nano .env  # preencher com os segredos da seção 1.2

# Subir infraestrutura (Postgres, MinIO, PostgREST, Caddy)
bash scripts/provisionar.sh
```

### 2.2. Sanity checks da infraestrutura

```bash
# Postgres responde
docker compose exec postgres psql -U postgres -c "SELECT version();"
# → PostgreSQL 16.x ✅

# MinIO responde
curl -fsS http://localhost:9000/minio/health/live
# → 200 OK ✅

# PostgREST responde
curl -fsS http://localhost:3001/ | head -5
# → JSON com paths ✅

# Caddy + TLS
curl -fsSI https://app.seudominio.com.br/api/health
# → 200, header `server: Caddy` ✅
```

### 2.3. Aplicar migrations no Postgres da VPS

```bash
docker compose exec api npm run db:migrate
docker compose exec postgres psql -U postgres -d app -c "\dt public.*"
# → todas as tabelas listadas ✅
```

---

## 3. Dry-run em staging (T-3 dias)

**Objetivo**: simular o cutover inteiro num ambiente isolado para cronometrar
e detectar problemas SEM tocar produção.

### 3.1. Subir staging

```bash
# Numa segunda VPS (ou mesma com porta diferente)
DOMINIO=staging.seudominio.com.br bash scripts/provisionar.sh
```

### 3.2. Executar passos 4–7 contra staging

Repetir o cutover real, mas:
- Usar dump do Supabase com data atual
- Fazer build com `VITE_API_URL=https://staging.seudominio.com.br/api`
- Validar todo fluxo crítico (seção 8)

### 3.3. Cronometrar

Anotar tempo de cada etapa. Se passo 5 (migração de dados) > 10 min, otimizar
(usar `pg_dump --jobs=4`, comprimir com `--format=custom`).

---

## 4. Comunicação aos usuários (T-1 dia)

Enviar e-mail/WhatsApp/banner no app:

> 📢 **Manutenção programada**
> Dia DD/MM, das HH:00 às HH:15, o sistema ficará em modo somente-leitura
> para uma migração de infraestrutura. Nenhum dado será perdido.
> Em caso de dúvidas: suporte@seudominio.com.br

---

## 5. CUTOVER (T-0)

### 5.1. T+0min — Entrar em read-only no Supabase

No painel do Supabase, aplicar via SQL Editor:

```sql
-- Bloqueia escrita em todas as tabelas públicas (mantém leitura)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM authenticated, anon', r.tablename);
  END LOOP;
END$$;
```

✅ **Check**: tentar criar um chamado no app → erro "permission denied".
Anotar timestamp exato — esse é o T+0 oficial.

### 5.2. T+1min — Dump final do Supabase

```bash
# Numa máquina de bastion (sua workstation ou a própria VPS)
export SUPABASE_DB_URL="postgresql://..."

pg_dump "$SUPABASE_DB_URL" \
  --no-owner --no-acl \
  --schema=public \
  --data-only \
  --format=custom \
  --jobs=4 \
  --file=/tmp/dump-final.dump

ls -lh /tmp/dump-final.dump
```

✅ **Check**: arquivo > 0 bytes, sem erros no stderr.

### 5.3. T+3min — Restore no Postgres da VPS

```bash
scp /tmp/dump-final.dump deploy@VPS_IP:/tmp/
ssh deploy@VPS_IP

cd /opt/app

# Truncar dados de teste (mantém schema)
docker compose exec postgres psql -U postgres -d app -c "
  TRUNCATE TABLE
    public.chamados, public.chamado_comentarios, public.chamado_anexos,
    public.chamado_historico, public.chamado_requisicao_itens,
    public.checklists, public.checklist_respostas, public.checklist_comentarios,
    public.checklist_historico, public.checklist_templates, public.checklist_template_itens,
    public.projetos, public.tarefas,
    public.notificacoes, public.workspace_membros, public.workspace_convites,
    public.workspace_membro_departamentos, public.departamentos,
    public.categorias_chamado, public.perfis, public.workspaces,
    public.workspace_ia_config, public.workspace_vmpay_config,
    public.workspace_uazapi_config
  RESTART IDENTITY CASCADE;
"

# Restore
docker compose exec -T postgres pg_restore \
  -U postgres -d app \
  --data-only \
  --disable-triggers \
  --jobs=4 \
  < /tmp/dump-final.dump
```

✅ **Check de integridade**:
```bash
docker compose exec postgres psql -U postgres -d app -c "
  SELECT 'chamados' tab, count(*) FROM chamados
  UNION ALL SELECT 'perfis',     count(*) FROM perfis
  UNION ALL SELECT 'workspaces', count(*) FROM workspaces
  UNION ALL SELECT 'projetos',   count(*) FROM projetos;
"
```

Comparar com contagem do Supabase (rodada antes do cutover):
```sql
SELECT 'chamados', count(*) FROM chamados
UNION ALL SELECT 'perfis', count(*) FROM perfis
UNION ALL SELECT 'workspaces', count(*) FROM workspaces
UNION ALL SELECT 'projetos', count(*) FROM projetos;
```

**Os números TÊM que bater.** Se não baterem, ABORTAR (seção 9).

### 5.4. T+5min — Migrar Storage (anexos)

```bash
# Sincronizar bucket chamado-anexos do Supabase Storage para MinIO
bash scripts/migrar-storage.sh

# Validar
docker compose exec minio mc ls local/chamado-anexos | wc -l
# comparar com contagem do Supabase
```

### 5.5. T+7min — Migrar senhas / sessões

Como o auth próprio usa bcrypt e o Supabase usa bcrypt-compatível, as senhas
funcionam direto. Migrar a tabela `auth.users`:

```bash
bash scripts/migrar-auth.sh
# → popula public.usuarios_auth com email + password_hash de auth.users
```

✅ **Check**: contagem de `usuarios_auth` deve ser igual a `auth.users` do Supabase.

### 5.6. T+8min — Cutover dos adapters (no repo)

Numa branch dedicada `cutover-vps`:

```bash
# Local, na sua máquina
git checkout -b cutover-vps
cp src/auth/atual.adapter.proprio.ts      src/auth/atual.adapter.ts
cp src/storage/atual.adapter.proprio.ts   src/storage/atual.adapter.ts
cp src/realtime/atual.adapter.proprio.ts  src/realtime/atual.adapter.ts
cp src/dados/atual.adapter.proprio.ts     src/dados/atual.adapter.ts

# Verificar build
npm run build:vps
# → deve compilar sem erros

git add -A
git commit -m "cutover: usar adapters próprios (VPS)"
git push origin cutover-vps
```

### 5.7. T+10min — Deploy na VPS

```bash
ssh deploy@VPS_IP
cd /opt/app
git fetch && git checkout cutover-vps
bash scripts/deploy.sh
# → builda imagem, sobe novo container, recarrega Caddy
```

✅ **Checks pós-deploy**:
```bash
# Health do app
curl -fsS https://app.seudominio.com.br/api/health
# → {"ok":true,"db":"ok","storage":"ok"}

# SSE realtime
curl -N -H "Cookie: ..." https://app.seudominio.com.br/api/realtime/eventos
# → conexão mantida, recebe pings
```

### 5.8. T+12min — Apontar DNS (se mudou)

Se o domínio era `chamados-nutricar.lovable.app` e agora é
`app.seudominio.com.br`:

- Atualizar registro A para o IP da VPS (TTL 300s)
- Aguardar propagação: `dig +short app.seudominio.com.br` deve devolver IP da VPS

Se manteve o mesmo domínio (já apontado para VPS desde T-7d): pular.

### 5.9. T+13min — Smoke test produção

Executar checklist da **seção 8** (smoke test). Se TUDO passar:

### 5.10. T+15min — Liberar tráfego

```sql
-- No Supabase: deixar tabelas em modo bloqueado mesmo (defesa)
-- Apenas comunicar fim da janela
```

📢 Comunicar: **"Sistema voltou ao ar."**

---

## 6. Pós-cutover — primeiras 2 horas

- [ ] Acompanhar logs em tempo real:
  ```bash
  docker compose logs -f api caddy postgres
  ```
- [ ] Monitorar métricas: CPU, RAM, conexões Postgres
  ```bash
  docker stats
  ```
- [ ] Validar com 3 usuários reais que fluxos críticos funcionam
- [ ] Manter Supabase **ligado mas em read-only** (rede de segurança)

---

## 7. T+24h — Confirmação final

Se tudo estável:

- [ ] Backup completo do novo Postgres: `bash scripts/backup.sh`
- [ ] Pausar projeto Supabase (não excluir ainda) — economia de custo
- [ ] Encerrar plano de rollback formalmente
- [ ] Documentar lições aprendidas em `deploy/POS-CUTOVER.md`

**Manter Supabase pausado por 30 dias** antes de excluir definitivamente.

---

## 8. Checklist de smoke test (executar a cada deploy)

Cada item deve passar **antes** de declarar sucesso:

### Auth
- [ ] Login com e-mail/senha existente funciona
- [ ] Logout funciona
- [ ] Reset de senha envia e-mail
- [ ] Sessão persiste após reload

### Dados (CRUD)
- [ ] Listar chamados retorna registros
- [ ] Criar novo chamado salva e aparece na lista
- [ ] Editar chamado (mudar status) persiste
- [ ] Adicionar comentário aparece na timeline
- [ ] Histórico do chamado mostra entradas

### Storage
- [ ] Upload de anexo (PDF + imagem) funciona
- [ ] Download via URL assinada abre o arquivo
- [ ] Anexos migrados do Supabase abrem corretamente

### Realtime
- [ ] Abrir 2 abas, criar chamado numa → outra recebe notificação
- [ ] Comentário em chamado → contador de notificações atualiza

### Integrações
- [ ] Botão "IA: sugerir resposta" funciona
- [ ] WhatsApp envia notificação (se UAZAPI configurada)
- [ ] Lojas VMPay listam (se configurada)

### Permissões (RLS-equivalente)
- [ ] Solicitante vê só seus chamados
- [ ] Atendente vê todos do workspace
- [ ] Admin acessa configurações

---

## 9. Plano de Rollback

> **Critério de acionamento**: qualquer item da seção 8 falha após 2
> tentativas, OU > 5 erros 5xx por minuto, OU contagem de dados não bate.

### Rollback rápido (< 5 min) — janela ainda aberta

Se ainda dentro da janela de manutenção e Supabase ainda está em read-only
mas íntegro:

```sql
-- 1. Reabilitar escrita no Supabase
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tablename);
  END LOOP;
END$$;
```

```bash
# 2. Reverter DNS (se mudou) para o domínio Lovable
# 3. Comunicar: "Migração revertida, sistema operando normal"
```

✅ **Estado**: voltou 100% ao Lovable Cloud, **zero perda de dados** (nada
foi escrito na VPS depois do dump).

### Rollback estendido (> 1h após cutover) — já houve escritas na VPS

Se usuários já criaram registros no Postgres da VPS:

```bash
# 1. Read-only na VPS (no Postgres)
docker compose exec postgres psql -U postgres -d app -c "
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE ON TABLES FROM PUBLIC;
"

# 2. Dump diferencial dos dados criados após o cutover
docker compose exec postgres pg_dump -U postgres -d app \
  --data-only \
  --table=public.chamados --table=public.chamado_comentarios \
  --where="criado_em > 'TIMESTAMP_DO_CUTOVER'" \
  > /tmp/delta.sql

# 3. Importar delta no Supabase via SQL Editor
# 4. Reabilitar escrita no Supabase (SQL acima)
# 5. Reverter DNS
# 6. Investigar causa raiz antes de tentar de novo
```

⚠️ **Risco de perda parcial** se delta falhar — por isso a janela curta e o
monitoramento intensivo nas primeiras 2h são críticos.

### Rollback de código (revert da branch)

```bash
# Local
git checkout main
git revert --no-edit cutover-vps
git push

# Na VPS (se quiser reverter o app mas manter infra de pé para debugging)
git checkout main
bash scripts/deploy.sh
```

---

## 10. Apêndice — Comandos úteis

### Logs por serviço
```bash
docker compose logs -f api          # Node app
docker compose logs -f postgres     # DB
docker compose logs -f caddy        # proxy/TLS
docker compose logs -f minio        # storage
```

### Backup manual
```bash
bash scripts/backup.sh               # dump + tar do MinIO → /backups
ls -lh /backups/$(date +%F)/
```

### Restore de backup
```bash
bash scripts/restore.sh /backups/2026-05-11/
```

### Health detalhado
```bash
curl -sS https://app.seudominio.com.br/api/health/detalhado | jq
# → { db: { ok, latencia_ms }, storage: { ok }, jobs: { ok } }
```

### Conexões ativas no Postgres
```bash
docker compose exec postgres psql -U postgres -d app -c "
  SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
"
```

---

## 11. Contatos de emergência

| Papel | Nome | Contato |
|---|---|---|
| Tech lead | _____ | _____ |
| DBA / Postgres | _____ | _____ |
| Provedor VPS (suporte) | Hetzner / DO | tickets |
| Suporte Lovable (caso reverta) | — | suporte |

---

**Última atualização**: 2026-05-11
**Owner**: equipe de engenharia
**Revisão**: a cada migração futura
