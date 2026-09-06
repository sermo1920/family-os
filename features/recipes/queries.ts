import { prisma } from "@/lib/db";

export async function listRecipes(householdId: string) {
  return prisma.recipe.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
  });
}

export async function listRecipesWithIngredients(householdId: string) {
  return prisma.recipe.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
    include: { ingredients: { include: { ingredient: true } } },
  });
}
