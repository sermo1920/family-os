import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Integration tests against a real, disposable Postgres database (never the
 * Supabase one): `TEST_DATABASE_URL=postgresql://... npm run test:integration`.
 * Migrations must be applied first (`prisma migrate deploy` on that URL).
 * The AI is replaced by a scripted fake client, no API key needed.
 */
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error(
    "TEST_DATABASE_URL manquante : base Postgres jetable requise pour les tests d'intégration.",
  );
}

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    env: { DATABASE_URL: url },
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
