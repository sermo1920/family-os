"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { recipeSchema } from "@/features/recipes/schema";

export type RecipeActionState = { error: string | null };

function parseRecipeForm(formData: FormData) {
  const ingredientIds = formData.getAll("ingredientId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const ingredients = ingredientIds.map((ingredientId, index) => ({
    ingredientId,
    quantity: quantities[index],
  }));

  return recipeSchema.safeParse({
    name: formData.get("name"),
    instructions: formData.get("instructions") || undefined,
    servings: formData.get("servings"),
    ingredients,
  });
}

export async function createRecipe(
  householdId: string,
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  await assertHouseholdAccess(householdId);

  const parsed = parseRecipeForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  // Un ingrédient soumis par le formulaire doit appartenir au même foyer —
  // sans cette vérification, quelqu'un pourrait référencer l'ingrédient
  // d'un autre foyer en connaissant simplement son id.
  const ingredientIds = parsed.data.ingredients.map((i) => i.ingredientId);
  const ownedCount = await prisma.ingredient.count({
    where: { id: { in: ingredientIds }, householdId },
  });
  if (ownedCount !== new Set(ingredientIds).size) {
    return { error: "Un des ingrédients sélectionnés est introuvable." };
  }

  await prisma.recipe.create({
    data: {
      householdId,
      name: parsed.data.name,
      instructions: parsed.data.instructions,
      servings: parsed.data.servings,
      ingredients: {
        create: parsed.data.ingredients.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          quantity: ingredient.quantity,
        })),
      },
    },
  });

  revalidatePath("/ingredients");
  return { error: null };
}

export async function updateRecipe(
  recipeId: string,
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId },
  });
  await assertHouseholdAccess(recipe.householdId);

  const parsed = parseRecipeForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const ingredientIds = parsed.data.ingredients.map((i) => i.ingredientId);
  const ownedCount = await prisma.ingredient.count({
    where: { id: { in: ingredientIds }, householdId: recipe.householdId },
  });
  if (ownedCount !== new Set(ingredientIds).size) {
    return { error: "Un des ingrédients sélectionnés est introuvable." };
  }

  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      name: parsed.data.name,
      instructions: parsed.data.instructions,
      servings: parsed.data.servings,
      // On remplace entièrement la liste plutôt que de calculer un diff :
      // une recette a rarement plus de quelques ingrédients, la simplicité
      // l'emporte sur l'économie de quelques requêtes.
      ingredients: {
        deleteMany: {},
        create: parsed.data.ingredients.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          quantity: ingredient.quantity,
        })),
      },
    },
  });

  // Pas de redirect : la recette est éditée depuis une popup sur la page
  // /ingredients (plus de page dédiée par recette), et Next.js rafraîchit
  // automatiquement la Server Component appelante après une Server Action —
  // revalidatePath suffit pour que la liste et la popup de vue affichent
  // les données à jour dès la fermeture de la popup d'édition.
  revalidatePath("/ingredients");
  return { error: null };
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId },
  });
  await assertHouseholdAccess(recipe.householdId);

  await prisma.recipe.delete({ where: { id: recipeId } });
  revalidatePath("/ingredients");
}
