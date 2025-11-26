import { createRequire } from "node:module";
import path from "node:path";
import build from "@hono/vite-build/cloudflare-workers";
import adapter from "@hono/vite-dev-server/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import honox from "honox/vite";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: {
    alias: {
      axios: path.resolve(path.dirname(require.resolve("axios/package.json")), "dist/esm/axios.js"),
    },
  },
  plugins: [
    honox({
      devServer: { adapter },
      client: { input: ["/app/client.ts", "/app/style.css"] },
    }),
    tailwindcss(),
    build(),
  ],
});
