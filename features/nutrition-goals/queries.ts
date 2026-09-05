import { prisma } from "@/lib/db";

/** L'objectif nutritionnel le plus récent d'un membre (la ligne courante). */
export async function getLatestGoal(memberId: string) {
  return prisma.nutritionGoal.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
}
