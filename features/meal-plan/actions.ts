"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { assignMealSchema } from "@/features/meal-plan/schema";
import type { MealSlot } from "@/lib/generated/prisma/client";

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
    create: {
      householdId,
      date,
      mealSlot,
      recipeId: parsed.data.recipeId,
      portionMultiplier: parsed.data.portionMultiplier,
      attendances: { create: memberIds.map((memberId) => ({ memberId })) },
    },
    update: {
      recipeId: parsed.data.recipeId,
      portionMultiplier: parsed.data.portionMultiplier,
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
