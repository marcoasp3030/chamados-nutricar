#!/usr/bin/env bash
# Build + publica o serviço no Swarm (Traefik + Postgres próprio + PostgREST).
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f "deploy/.env.swarm" ]; then
  echo "ERRO: deploy/.env.swarm não encontrado. Copie de deploy/.env.swarm.example."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source "deploy/.env.swarm"
set +a

echo "==> Validando pasta de storage"
mkdir -p /data/storage/chamados

# URI do PostgREST (role authenticator)
if [ -z "${POSTGREST_DB_URI:-}" ]; then
  if [ -z "${POSTGREST_AUTH_PASSWORD:-}" ]; then
    POSTGREST_AUTH_PASSWORD="${POSTGRES_PASSWORD:-$(echo "$DATABASE_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p')}"
  fi
  POSTGREST_DB_URI="postgres://authenticator:${POSTGREST_AUTH_PASSWORD}@postgres:5432/chamados"
  export POSTGREST_DB_URI
fi

echo "==> Aplicando SQL PostgREST/RLS no Postgres (host)"
PGCONT=$(docker ps --filter name=postgres_postgres -q | head -1)
if [ -n "$PGCONT" ]; then
  docker exec -i "$PGCONT" psql -U postgres -d chamados -v ON_ERROR_STOP=0 \
    < scripts/db-init/01-postgrest-roles.sql 2>&1 | tail -5 || true
  if [ -n "${POSTGREST_AUTH_PASSWORD:-}" ]; then
    docker exec -i "$PGCONT" psql -U postgres -d chamados -c \
      "ALTER ROLE authenticator WITH PASSWORD '${POSTGREST_AUTH_PASSWORD}';" >/dev/null 2>&1 || true
  fi
  docker exec -i "$PGCONT" psql -U postgres -d chamados -v ON_ERROR_STOP=0 \
    < scripts/db-init/02-rls-e-funcoes.sql 2>&1 | tail -5 || true
  for sql in scripts/db-init/0[3-9]*.sql scripts/db-init/[1-9]*.sql; do
    [ -f "$sql" ] || continue
    echo "    -> $(basename "$sql")"
    docker exec -i "$PGCONT" psql -U postgres -d chamados -v ON_ERROR_STOP=0 \
      < "$sql" 2>&1 | tail -3 || true
  done
else
  echo "AVISO: container Postgres não encontrado — pule SQL ou aplique manualmente."
fi

echo "==> Build da imagem (Postgres próprio, sem Supabase Cloud)"
docker build -t chamados-nutricar:latest .

echo "==> Rodando migrations Drizzle"
MIGRATE_URL="${DATABASE_URL//@postgres:/@127.0.0.1:}"
docker run --rm \
  --network host \
  -e DATABASE_URL="$MIGRATE_URL" \
  chamados-nutricar:latest \
  npm run db:migrate

echo "==> Publicando stack no Swarm"
export POSTGREST_DB_URI
docker stack deploy -c deploy/docker-compose.swarm.yml chamados

echo "==> Forçando recriação das tarefas"
docker service update --force chamados_chamados_app 2>/dev/null || true
docker service update --force chamados_postgrest 2>/dev/null || true

echo "==> Status"
docker service ls | awk 'NR==1 || $2 ~ /^chamados_/' || true

echo "==> Deploy concluído."
