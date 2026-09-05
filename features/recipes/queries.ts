import { prisma } from "@/lib/db";

export async function listRecipes(householdId: string) {
  return prisma.recipe.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
  });
}

export async function getRecipeWithIngredients(recipeId: string) {
  return prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: { include: { ingredient: true } } },
  });
}
