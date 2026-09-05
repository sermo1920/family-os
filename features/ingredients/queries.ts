import { prisma } from "@/lib/db";

export async function listIngredients(householdId: string) {
  return prisma.ingredient.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
  });
}
