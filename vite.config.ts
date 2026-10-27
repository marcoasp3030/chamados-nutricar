import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        ignoreImporters: [
          "**/src/lib/*.functions.ts",
          "**/src/storage/*.functions.ts",
          "**/src/auth/*.functions.ts",
        ],
      },
    }),
    ...(command === "build" ? [nitro({ defaultPreset: "node-server" })] : []),
    react(),
  ],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  server: {
    host: "::",
    port: 8080,
    watch: { ignored: ["**/src/routeTree.gen.ts"] },
  },
}));
