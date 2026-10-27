import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      // Server functions importam middleware.server de propósito; o check
      // de import-protection trata isso como vazamento no client.
      importProtection: {
        ignoreImporters: [
          "**/src/lib/*.functions.ts",
          "**/src/storage/*.functions.ts",
          "**/src/auth/*.functions.ts",
        ],
      },
    }),
    nitro({ defaultPreset: "node-server" }),
    react(),
  ],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  server: { watch: { ignored: ["**/routeTree.gen.ts"] } },
  build: {
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: { maxParallelFileOps: 1 },
  },
  ssr: {
    noExternal: ["@tanstack/react-start", "@tanstack/react-router"],
    external: ["postgres", "drizzle-orm", "drizzle-orm/postgres-js", "bcryptjs", "jose"],
  },
});
