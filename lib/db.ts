import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// En développement, Next.js recharge les modules à chaud : sans ce singleton
// global, chaque rechargement créerait un nouveau PrismaClient (et donc un
// nouveau pool de connexions Postgres), jusqu'à épuiser les connexions
// disponibles côté Supabase.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Diagnostic temporaire : affiche la chaîne de connexion avec le mot de
  // passe masqué (jamais loggé en clair), pour voir précisément où est le
  // problème (guillemets/espaces parasites, host tronqué...). À retirer une
  // fois le problème de connexion résolu.
  const raw = process.env.DATABASE_URL ?? "";
  const masked = raw.replace(/:\/\/([^:]*):([^@]*)@/, "://$1:***@");
  console.log(
    `[lib/db] DATABASE_URL len=${raw.length} first3=${JSON.stringify(raw.slice(0, 3))} last3=${JSON.stringify(raw.slice(-3))} masked=${JSON.stringify(masked)}`,
  );

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
