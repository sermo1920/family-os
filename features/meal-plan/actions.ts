"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { assignMealSchema } from "@/features/meal-plan/schema";
import type { MealSlot } from "@/lib/generated/prisma/client";
import { addDays, toDateKey } from "@/features/meal-plan/dates";
import { markMealPrepared, validateMeals } from "@/features/meal-plan/service";

export type MealPlanActionState = { error: string | null };

export async function assignMeal(
  householdId: string,
  dateKey: string,
  mealSlot: MealSlot,
  _prevState: MealPlanActionState,
  formData: FormData,
): Promise<MealPlanActionState> {
  await assertHouseholdAccess(householdId);

  const parsed = assignMealSchema.safeParse({
    recipeId: formData.get("recipeId"),
    portionMultiplier: formData.get("portionMultiplier"),
    memberIds: formData.getAll("memberId").map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  // Un id de recette ou de membre soumis doit appartenir au même foyer.
  const recipe = await prisma.recipe.findFirst({
    where: { id: parsed.data.recipeId, householdId },
  });
  if (!recipe) return { error: "Recette introuvable." };

  const memberIds = parsed.data.memberIds;
  if (memberIds.length > 0) {
    const ownedCount = await prisma.member.count({
      where: { id: { in: memberIds }, householdId },
    });
    if (ownedCount !== new Set(memberIds).size) {
      return { error: "Un des membres sélectionnés est introuvable." };
    }
  }

  const date = new Date(`${dateKey}T00:00:00.000Z`);

  await prisma.plannedMeal.upsert({
    where: { householdId_date_mealSlot: { householdId, date, mealSlot } },
    // A meal chosen by hand in the planner is the household's own choice:
    // validated directly (only the cooking agent creates PROPOSED meals).
    create: {
      householdId,
      date,
      mealSlot,
      recipeId: parsed.data.recipeId,
      portionMultiplier: parsed.data.portionMultiplier,
      status: "VALIDATED",
      attendances: { create: memberIds.map((memberId) => ({ memberId })) },
    },
    update: {
      recipeId: parsed.data.recipeId,
      portionMultiplier: parsed.data.portionMultiplier,
      status: "VALIDATED",
      attendances: {
        deleteMany: {},
        create: memberIds.map((memberId) => ({ memberId })),
      },
    },
  });

  revalidatePath("/planner");
  return { error: null };
}

export async function removeMeal(plannedMealId: string): Promise<void> {
  const meal = await prisma.plannedMeal.findUniqueOrThrow({
    where: { id: plannedMealId },
  });
  await assertHouseholdAccess(meal.householdId);

  await prisma.plannedMeal.delete({ where: { id: plannedMealId } });
  revalidatePath("/planner");
}

export async function validateMeal(plannedMealId: string): Promise<void> {
  const meal = await prisma.plannedMeal.findUniqueOrThrow({
    where: { id: plannedMealId },
  });
  await assertHouseholdAccess(meal.householdId);

  await validateMeals(meal.householdId, { mealIds: [meal.id] });
  revalidatePath("/planner");
}

export async function validateWeek(
  householdId: string,
  weekStartKey: string,
): Promise<{ error: string | null; count: number }> {
  await assertHouseholdAccess(householdId);

  const weekStart = new Date(`${weekStartKey}T00:00:00.000Z`);
  const count = await validateMeals(householdId, {
    startKey: weekStartKey,
    endKeyInclusive: toDateKey(addDays(weekStart, 6)),
  });
  revalidatePath("/planner");
  return { error: null, count };
}

export async function markPrepared(
  plannedMealId: string,
): Promise<{ error: string | null; message: string | null }> {
  const meal = await prisma.plannedMeal.findUniqueOrThrow({
    where: { id: plannedMealId },
  });
  await assertHouseholdAccess(meal.householdId);

  const result = await markMealPrepared(meal.householdId, meal.id);
  if (!result.ok) return { error: result.error, message: null };
  revalidatePath("/planner");
  revalidatePath("/preferences");
  return {
    error: null,
    message:
      result.changes.length > 0
        ? `Stock mis à jour : ${result.changes.map((c) => c.name).join(", ")}`
        : "Préparé (aucun stock connu à décompter)",
  };
}
