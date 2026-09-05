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
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
