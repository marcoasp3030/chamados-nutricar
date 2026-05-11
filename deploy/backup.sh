#!/usr/bin/env bash
# Backup do Postgres + storage local. Cron sugerido: diário 03:00.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/chamados}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "==> Dump do banco"
docker compose exec -T db pg_dump -U app -d app -Fc \
  > "$BACKUP_DIR/db-$STAMP.dump"

echo "==> Tar do storage"
tar -C /data -czf "$BACKUP_DIR/storage-$STAMP.tar.gz" storage

echo "==> Limpando backups com mais de ${KEEP_DAYS} dias"
find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete

echo "==> OK: $BACKUP_DIR"
ls -lh "$BACKUP_DIR" | tail -n 10
