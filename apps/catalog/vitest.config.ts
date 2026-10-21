import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// DB-backed tests read DATABASE_URL from the repository root .env (same file the seed uses).
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The real package throws outside React Server Components.
      "server-only": fileURLToPath(new URL("./vitest.server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
