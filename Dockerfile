# ===== Estágio 1: build =====
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Dependências
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

# Código
COPY . .

# Build de produção (TanStack Start + Vite, preset Node).
# Usa vite.config.vps.ts (sem Cloudflare Workers).
ENV NITRO_PRESET=node-server
RUN bun run build:vps


# ===== Estágio 2: runtime =====
FROM oven/bun:1.1-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copia somente o necessário para rodar
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/db ./src/db

# Diretório padrão para storage local (montar volume aqui)
RUN mkdir -p /data/storage
ENV STORAGE_DIR=/data/storage

EXPOSE 3000

# Healthcheck simples (ajuste a rota se tiver /healthz)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

# Sobe o servidor Node gerado pelo build
CMD ["node", ".output/server/index.mjs"]
