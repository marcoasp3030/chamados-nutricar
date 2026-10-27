# ===== Estágio 1: build =====
FROM node:22-alpine AS builder

WORKDIR /app

# Dependências
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Código
COPY . .

# O browser só vê o que o Vite inlined no `build:vps`. Ficheiros `.env` não são copiados
# (.dockerignore). Passar SUPABASE / VITE_* como build-arg (ver deploy-swarm.sh).
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_PUBLISHABLE_KEY=""
ARG VITE_SUPABASE_PROJECT_ID=""
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
ARG SUPABASE_URL=""
ARG SUPABASE_PUBLISHABLE_KEY=""
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY}

# Build de produção (TanStack Start + Vite, preset Node).
# Usa vite.config.vps.ts (sem Cloudflare Workers).
ENV NITRO_PRESET=node-server
RUN npm run build:vps


# ===== Estágio 2: runtime =====
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Saída atual do build:vps (Vite 7 + TanStack Start): pasta dist/ (não mais .output/).
COPY --from=builder /app/dist ./dist
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

# Servidor Node gerado em dist/server (ESM; package.json já define "type": "module").
CMD ["node", "dist/server/server.js"]
