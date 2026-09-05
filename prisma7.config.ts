import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// La CLI Prisma tourne hors de Next.js, donc elle ne lit pas .env.local
// automatiquement : on le charge explicitement ici pour garder une seule
// source de vérité pour les variables d'environnement.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Les migrations passent par la connexion directe (pas de pgbouncer),
    // qui supporte les prepared statements requis par `prisma migrate`.
    url: process.env["DIRECT_URL"],
  },
});
