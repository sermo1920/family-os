"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { ingredientSchema } from "@/features/ingredients/schema";

export type IngredientActionState = { error: string | null };

function parseIngredientForm(formData: FormData) {
  return ingredientSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    baseUnit: formData.get("baseUnit"),
    caloriesPer100: formData.get("caloriesPer100"),
    proteinPer100: formData.get("proteinPer100"),
    carbsPer100: formData.get("carbsPer100"),
    fatPer100: formData.get("fatPer100"),
  });
}

export async function createIngredient(
  householdId: string,
  _prevState: IngredientActionState,
  formData: FormData,
): Promise<IngredientActionState> {
  await assertHouseholdAccess(householdId);

  const parsed = parseIngredientForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  await prisma.ingredient.create({
    data: { householdId, ...parsed.data },
  });

  revalidatePath("/ingredients");
  return { error: null };
}

export async function deleteIngredient(ingredientId: string): Promise<void> {
  const ingredient = await prisma.ingredient.findUniqueOrThrow({
    where: { id: ingredientId },
  });
  await assertHouseholdAccess(ingredient.householdId);

  await prisma.ingredient.delete({ where: { id: ingredientId } });
  revalidatePath("/ingredients");
}
