#!/usr/bin/env bash
# Provisionamento inicial da VPS (Ubuntu/Debian).
# Uso: ssh root@vps "bash -s" < deploy/setup-vps.sh
set -euo pipefail

APP_USER="${APP_USER:-deploy}"
APP_DIR="/opt/chamados"

echo "==> Atualizando pacotes"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ufw fail2ban ca-certificates gnupg lsb-release

echo "==> Instalando Docker + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "==> Criando usuário ${APP_USER}"
if ! id "$APP_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$APP_USER"
  usermod -aG docker "$APP_USER"
fi

echo "==> Estrutura de diretórios"
mkdir -p "$APP_DIR" /data/storage /data/db
chown -R "$APP_USER:$APP_USER" "$APP_DIR" /data

echo "==> Firewall (UFW)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> fail2ban"
systemctl enable --now fail2ban

echo "==> Pronto."
echo "Próximos passos:"
echo "  1) Copie o repositório para ${APP_DIR} (ex: git clone ...)"
echo "  2) Crie ${APP_DIR}/.env.production a partir de .env.production.example"
echo "  3) Rode: cd ${APP_DIR} && bash deploy/deploy.sh"
