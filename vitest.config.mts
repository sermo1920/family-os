import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // e2e/ contient des tests Playwright (mêmes extensions .spec.ts) : les
    // exclure explicitement, sinon Vitest essaie de les exécuter aussi.
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
