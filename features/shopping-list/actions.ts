"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { aggregateIngredientUsages } from "@/features/shopping-list/aggregate";
import {
  createListSchema,
  importPlannedMealsSchema,
  manualItemSchema,
} from "@/features/shopping-list/schema";

export type ShoppingListActionState = { error: string | null };

export async function createShoppingList(
  householdId: string,
  _prevState: ShoppingListActionState,
  formData: FormData,
): Promise<ShoppingListActionState> {
  await assertHouseholdAccess(householdId);

  const parsed = createListSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const shoppingList = await prisma.shoppingList.create({
    data: { householdId, name: parsed.data.name },
  });

  revalidatePath("/shopping-lists");
  redirect(`/shopping-lists/${shoppingList.id}`);
}

/**
 * Ajoute à une liste existante les ingrédients des repas planifiés sur une
 * plage de dates : contrairement à l'ancien flux (une génération = une
 * liste), une liste peut recevoir plusieurs imports au fil du temps, en plus
 * des articles ajoutés à la main. Un ingrédient déjà présent dans la liste
 * (même `ingredientId`) voit sa quantité augmentée plutôt que dupliquée.
 */
export async function importPlannedMeals(
  shoppingListId: string,
  _prevState: ShoppingListActionState,
  formData: FormData,
): Promise<ShoppingListActionState> {
  const shoppingList = await prisma.shoppingList.findUniqueOrThrow({
    where: { id: shoppingListId },
  });
  await assertHouseholdAccess(shoppingList.householdId);

  const parsed = importPlannedMealsSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const startDate = new Date(`${parsed.data.startDate}T00:00:00.000Z`);
  // La borne de fin est inclusive côté formulaire (le dernier jour de la
  // plage compte) donc on ajoute un jour pour la requête `lt` en base.
  const endDateExclusive = new Date(
    new Date(`${parsed.data.endDate}T00:00:00.000Z`).getTime() +
      24 * 60 * 60 * 1000,
  );
  if (endDateExclusive <= startDate) {
    return { error: "La date de fin doit être après la date de début." };
  }

  const meals = await prisma.plannedMeal.findMany({
    where: {
      householdId: shoppingList.householdId,
      date: { gte: startDate, lt: endDateExclusive },
    },
    include: {
      recipe: { include: { ingredients: { include: { ingredient: true } } } },
    },
  });

  const usages = meals.flatMap((meal) =>
    meal.recipe.ingredients.map((ri) => ({
      ingredientId: ri.ingredientId,
      name: ri.ingredient.name,
      category: ri.ingredient.category,
      unit: ri.ingredient.baseUnit,
      quantity: ri.quantity * meal.portionMultiplier,
    })),
  );
  const aggregated = aggregateIngredientUsages(usages);

  if (aggregated.length === 0) {
    return { error: "Aucun repas planifié sur cette période." };
  }

  const existingItems = await prisma.shoppingListItem.findMany({
    where: { shoppingListId, ingredientId: { not: null } },
  });
  const existingByIngredient = new Map(
    existingItems.map((item) => [item.ingredientId, item]),
  );

  await prisma.$transaction(
    aggregated.map((usage) => {
      const roundedQuantity = Math.round(usage.quantity * 10) / 10;
      const existing = existingByIngredient.get(usage.ingredientId);
      if (existing) {
        return prisma.shoppingListItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + roundedQuantity },
        });
      }
      return prisma.shoppingListItem.create({
        data: {
          shoppingListId,
          ingredientId: usage.ingredientId,
          name: usage.name,
          category: usage.category,
          quantity: roundedQuantity,
          unit: usage.unit,
        },
      });
    }),
  );

  revalidatePath(`/shopping-lists/${shoppingListId}`);
  return { error: null };
}

async function getShoppingListIdForItem(itemId: string) {
  const item = await prisma.shoppingListItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { shoppingList: true },
  });
  await assertHouseholdAccess(item.shoppingList.householdId);
  return item;
}

export async function toggleItem(itemId: string): Promise<void> {
  const item = await getShoppingListIdForItem(itemId);

  await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: { isChecked: !item.isChecked },
  });

  revalidatePath(`/shopping-lists/${item.shoppingListId}`);
}

export async function deleteItem(itemId: string): Promise<void> {
  const item = await getShoppingListIdForItem(itemId);

  await prisma.shoppingListItem.delete({ where: { id: itemId } });

  revalidatePath(`/shopping-lists/${item.shoppingListId}`);
}

export async function addManualItem(
  shoppingListId: string,
  _prevState: ShoppingListActionState,
  formData: FormData,
): Promise<ShoppingListActionState> {
  const shoppingList = await prisma.shoppingList.findUniqueOrThrow({
    where: { id: shoppingListId },
  });
  await assertHouseholdAccess(shoppingList.householdId);

  const parsed = manualItemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  await prisma.shoppingListItem.create({
    data: { shoppingListId, ...parsed.data },
  });

  revalidatePath(`/shopping-lists/${shoppingListId}`);
  return { error: null };
}

export async function deleteShoppingList(
  shoppingListId: string,
): Promise<void> {
  const shoppingList = await prisma.shoppingList.findUniqueOrThrow({
    where: { id: shoppingListId },
  });
  await assertHouseholdAccess(shoppingList.householdId);

  await prisma.shoppingList.delete({ where: { id: shoppingListId } });
  revalidatePath("/shopping-lists");
}
