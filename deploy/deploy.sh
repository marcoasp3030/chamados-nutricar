#!/usr/bin/env bash
# Build + sobe stack na VPS. Roda migrations antes de subir o app.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
  echo "ERRO: .env.production não encontrado. Copie de .env.production.example."
  exit 1
fi

echo "==> Pull código (opcional)"
git pull --ff-only || true

echo "==> Build da imagem"
docker compose --env-file .env.production build app

echo "==> Subindo banco"
docker compose --env-file .env.production up -d db
echo "==> Aguardando Postgres ficar saudável..."
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U app -d app >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Rodando migrations Drizzle"
docker compose --env-file .env.production run --rm app bun run db:migrate

echo "==> Subindo app + Caddy"
docker compose --env-file .env.production up -d app caddy

echo "==> Status"
docker compose ps

echo "==> Deploy concluído."
