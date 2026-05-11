// Vite config para build em VPS Node (sem Cloudflare Workers).
// Uso: `vite build --config vite.config.vps.ts`
// Ou via env: NITRO_PRESET=node-server bun run build:vps
//
// Diferenças vs vite.config.ts:
// - Não usa o plugin Cloudflare (preset Node do Nitro/TanStack)
// - Mantém os mesmos plugins padrão do @lovable.dev/vite-tanstack-config
// - Pronto para rodar atrás de Caddy/Nginx no Docker (Fase 7)
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    // Preset Node para gerar .output/server/index.mjs
    target: "node-server",
  },
  vite: {
    build: {
      // Reduz tamanho do bundle do servidor
      minify: "esbuild",
      sourcemap: false,
    },
    ssr: {
      // No Node nativo não precisamos do shim do Cloudflare;
      // deixar pacotes Node como external melhora cold start.
      noExternal: ["@tanstack/react-start", "@tanstack/react-router"],
    },
  },
});
