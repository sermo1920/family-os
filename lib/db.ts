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
  // Diagnostic temporaire : n'affiche jamais le mot de passe, seulement ce
  // que Node parvient à extraire comme hôte/port depuis DATABASE_URL, pour
  // débugger une erreur de connexion en prod sans exposer de secret dans les
  // logs. À retirer une fois le problème de connexion résolu.
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    console.log(
      `[lib/db] DATABASE_URL parsed host="${url.hostname}" port="${url.port}" protocol="${url.protocol}" hasPassword=${Boolean(url.password)}`,
    );
  } catch (err) {
    console.log(
      `[lib/db] DATABASE_URL failed to parse as a URL: ${(err as Error).message}. isSet=${Boolean(process.env.DATABASE_URL)} length=${process.env.DATABASE_URL?.length ?? 0}`,
    );
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
