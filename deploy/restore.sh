#!/usr/bin/env bash
# Restaura banco e storage a partir de um snapshot.
# Uso: bash deploy/restore.sh /var/backups/chamados/db-AAAAMMDD.dump /var/backups/chamados/storage-AAAAMMDD.tar.gz
set -euo pipefail

DB_DUMP="${1:?dump do Postgres}"
STORAGE_TGZ="${2:?tar.gz do storage}"

echo "==> Restaurando banco a partir de $DB_DUMP"
cat "$DB_DUMP" | docker compose exec -T db pg_restore -U app -d app --clean --if-exists

echo "==> Restaurando storage a partir de $STORAGE_TGZ"
tar -C /data -xzf "$STORAGE_TGZ"

echo "==> Restart do app"
docker compose restart app

echo "==> OK"
