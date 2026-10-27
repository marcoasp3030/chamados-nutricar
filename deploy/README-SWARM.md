# Deploy em Swarm/Traefik (VPS Nutricar)

Este repositório já possui um deploy padrão via Docker Compose + Caddy (`docker-compose.yml`) e o arquivo **`.env.production`** na raiz (veja `.env.production.example`) para esse modo.

Nesta VPS Nutricar, porém, **as portas 80/443 já são do Traefik do Swarm** — subir o stack completo com Caddy (`bash deploy/deploy.sh`) tende a **falhar** por conflito de bind nas portas 80/443. O caminho recomendado aqui é o **Swarm** abaixo.

## Quando usar cada modo

| Modo | Quando usar |
|------|-------------|
| **`.env.production` + `deploy/deploy.sh`** | VPS dedicada ao projeto, sem outro proxy nas portas 80/443 (sobe `app` + Postgres interno `db` + Caddy). |
| **`deploy/.env.swarm` + `deploy/deploy-swarm.sh`** | VPS com Traefik no Swarm já publicando HTTPS (esta Nutricar); Postgres compartilhado no host `postgres`. |

## Pré-requisitos

- DNS do domínio apontando para o IP da VPS:
  - `nutricarhub.nutricarbrasil.com.br` → IP da VPS
- Rede Swarm existente: `network_swarm_public`
- Serviço Postgres existente no Swarm acessível como hostname `postgres` na rede `network_swarm_public`

## Configuração

Crie o arquivo `deploy/.env.swarm` (NÃO COMMITAR) a partir do exemplo:

```bash
cp deploy/.env.swarm.example deploy/.env.swarm
```

Edite os valores:

- `DOMAIN`: domínio do sistema
- `APP_BASE_URL`: URL pública (https)
- `DATABASE_URL`: string de conexão no formato:
  - `postgres://postgres:SENHA@postgres:5432/chamados`
- `JWT_SECRET` e `STORAGE_URL_SECRET`: gerar com `openssl rand -base64 48`

## Subir / atualizar

```bash
bash deploy/deploy-swarm.sh
```

O script faz:

- cria `/data/storage/chamados` (bind mount)
- valida `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env.swarm` (necessários no **build** da imagem; o `.env` local não entra no Docker)
- build da imagem `chamados-nutricar:latest` com `--build-arg` para o Vite incorporar o Supabase no bundle do browser
- roda migrations (`bun run db:migrate`) usando **rede `--network host`** e `127.0.0.1` no lugar de `postgres`, porque redes overlay do Swarm não permitem `docker run` avulso nelas
- publica no Swarm (`docker stack deploy ...`)
- força recriação das tarefas (`docker service update --force chamados_chamados_app`) para que contentores com tag `:latest` apanhem a imagem acabada de construir (evita ficar com digest antigo e 404 em `/assets/*`)

## Logs

```bash
docker service logs -f chamados_chamados_app
```

## Observações

- O roteamento TLS é feito pelo Traefik (router `chamados-https`).
- Não sobe Caddy neste modo.

