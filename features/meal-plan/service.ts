import { prisma } from "@/lib/db";
import type { MealSlot } from "@/lib/generated/prisma/client";
import { addDays, toDateKey } from "@/features/meal-plan/dates";
import { mealSlotLabels } from "@/features/meal-plan/schema";
import {
  portionMultiplier,
  servingsFromMultiplier,
} from "@/features/recipes/scaling";
import { computePantryConsumption } from "@/features/pantry/consumption";

/**
 * Meal-plan operations shared by the planner UI and the cooking agent.
 * Dates are "YYYY-MM-DD" day keys, stored at midnight UTC (cf. dates.ts).
 */

export function dateFromKey(dateKey: string): Date {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateKey(date) !== dateKey) {
    throw new Error(`Date invalide : ${dateKey}`);
  }
  return date;
}

const weekdayFormatter = new Intl.DateTimeFormat("fr-CH", {
  weekday: "long",
  timeZone: "UTC",
});

export function describeSlot(date: Date, slot: MealSlot): string {
  return `${weekdayFormatter.format(date)} ${toDateKey(date)} (${mealSlotLabels[slot].toLowerCase()})`;
}

/** Meals between two day keys, both inclusive. */
export async function getMenu(
  householdId: string,
  startKey: string,
  endKeyInclusive: string,
) {
  const meals = await prisma.plannedMeal.findMany({
    where: {
      householdId,
      date: {
        gte: dateFromKey(startKey),
        lt: addDays(dateFromKey(endKeyInclusive), 1),
      },
    },
    include: {
      recipe: true,
      leftoverOf: true,
      attendances: { include: { member: true } },
    },
    orderBy: [{ date: "asc" }, { mealSlot: "asc" }],
  });

  return meals.map((meal) => ({
    id: meal.id,
    date: toDateKey(meal.date),
    weekday: weekdayFormatter.format(meal.date),
    slot: meal.mealSlot,
    status: meal.status,
    recipeId: meal.recipeId,
    recipeName: meal.recipe.name,
    servings: servingsFromMultiplier(
      meal.recipe.servings,
      meal.portionMultiplier,
    ),
    totalMinutes:
      meal.recipe.prepTimeMinutes === null &&
      meal.recipe.cookTimeMinutes === null
        ? null
        : (meal.recipe.prepTimeMinutes ?? 0) +
          (meal.recipe.cookTimeMinutes ?? 0),
    notes: meal.notes,
    leftoverOf: meal.leftoverOf
      ? {
          date: toDateKey(meal.leftoverOf.date),
          slot: meal.leftoverOf.mealSlot,
        }
      : null,
    prepared: meal.preparedAt !== null,
    eaters: meal.attendances.map((a) => a.member.displayName),
  }));
}

export interface PlanMealInput {
  date: string;
  slot: MealSlot;
  recipeId: string;
  /** Servings to cook (or to eat, for a leftover meal). */
  servings?: number;
  notes?: string | null;
  leftoverOf?: { date: string; slot: MealSlot };
  /** Explicit user request to replace an already validated meal. */
  replaceValidated?: boolean;
}

export interface PlanMealOutcome {
  date: string;
  slot: MealSlot;
  ok: boolean;
  message: string;
  replaced?: string;
}

/**
 * Upserts one planned meal per (day, slot) as PROPOSED — re-running the same
 * plan never duplicates meals, and only the slots passed are touched (the
 * rest of the menu is left as is). A validated or already prepared meal is
 * only replaced on explicit request.
 */
export async function planMeals(
  householdId: string,
  inputs: PlanMealInput[],
): Promise<PlanMealOutcome[]> {
  const outcomes: PlanMealOutcome[] = [];
  // Cooked meals first, so a leftover can point to a meal of the same batch.
  const ordered = [...inputs].sort(
    (a, b) => Number(Boolean(a.leftoverOf)) - Number(Boolean(b.leftoverOf)),
  );

  for (const input of ordered) {
    const date = dateFromKey(input.date);
    const label = describeSlot(date, input.slot);

    const recipe = await prisma.recipe.findFirst({
      where: { id: input.recipeId, householdId },
    });
    if (!recipe) {
      outcomes.push({
        date: input.date,
        slot: input.slot,
        ok: false,
        message: `${label} : recette introuvable (${input.recipeId}).`,
      });
      continue;
    }

    const existing = await prisma.plannedMeal.findUnique({
      where: {
        householdId_date_mealSlot: { householdId, date, mealSlot: input.slot },
      },
      include: { recipe: true },
    });
    if (existing && existing.preparedAt) {
      outcomes.push({
        date: input.date,
        slot: input.slot,
        ok: false,
        message: `${label} : déjà marqué comme préparé (${existing.recipe.name}), non remplacé.`,
      });
      continue;
    }
    if (
      existing &&
      existing.status === "VALIDATED" &&
      existing.recipeId !== input.recipeId &&
      !input.replaceValidated
    ) {
      outcomes.push({
        date: input.date,
        slot: input.slot,
        ok: false,
        message: `${label} : un repas validé existe déjà (${existing.recipe.name}). Non remplacé sans demande explicite.`,
      });
      continue;
    }

    let leftoverOfId: string | null = null;
    if (input.leftoverOf) {
      const source = await prisma.plannedMeal.findUnique({
        where: {
          householdId_date_mealSlot: {
            householdId,
            date: dateFromKey(input.leftoverOf.date),
            mealSlot: input.leftoverOf.slot,
          },
        },
      });
      if (!source || source.recipeId !== input.recipeId) {
        outcomes.push({
          date: input.date,
          slot: input.slot,
          ok: false,
          message: `${label} : repas source des restes introuvable ou recette différente.`,
        });
        continue;
      }
      leftoverOfId = source.id;
    }

    const servings = input.servings ?? recipe.servings;
    const data = {
      recipeId: recipe.id,
      portionMultiplier: portionMultiplier(recipe.servings, servings),
      // Re-planning the same recipe on a validated slot (e.g. new servings)
      // keeps it validated; any other change is a new proposal to validate.
      status:
        existing?.status === "VALIDATED" && existing.recipeId === recipe.id
          ? ("VALIDATED" as const)
          : ("PROPOSED" as const),
      notes: input.notes ?? null,
      leftoverOfId,
    };

    await prisma.plannedMeal.upsert({
      where: {
        householdId_date_mealSlot: { householdId, date, mealSlot: input.slot },
      },
      create: { householdId, date, mealSlot: input.slot, ...data },
      update: data,
    });

    outcomes.push({
      date: input.date,
      slot: input.slot,
      ok: true,
      message: `${label} : ${recipe.name}, ${servings} portion${servings > 1 ? "s" : ""}${leftoverOfId ? " (restes)" : ""}`,
      ...(existing && existing.recipeId !== recipe.id
        ? { replaced: existing.recipe.name }
        : {}),
    });
  }

  return outcomes;
}

export async function removeMealAt(
  householdId: string,
  dateKey: string,
  slot: MealSlot,
) {
  const date = dateFromKey(dateKey);
  const meal = await prisma.plannedMeal.findUnique({
    where: { householdId_date_mealSlot: { householdId, date, mealSlot: slot } },
    include: { recipe: true },
  });
  if (!meal) return null;
  await prisma.plannedMeal.delete({ where: { id: meal.id } });
  return { label: describeSlot(date, slot), recipeName: meal.recipe.name };
}

/** Validates the PROPOSED meals of a range (or of explicit ids). */
export async function validateMeals(
  householdId: string,
  scope: { startKey: string; endKeyInclusive: string } | { mealIds: string[] },
) {
  const where =
    "mealIds" in scope
      ? { householdId, id: { in: scope.mealIds }, status: "PROPOSED" as const }
      : {
          householdId,
          status: "PROPOSED" as const,
          date: {
            gte: dateFromKey(scope.startKey),
            lt: addDays(dateFromKey(scope.endKeyInclusive), 1),
          },
        };
  const result = await prisma.plannedMeal.updateMany({
    where,
    data: { status: "VALIDATED" },
  });
  return result.count;
}

/**
 * Explicit "this meal was cooked" action: decrements known stock by the
 * recipe quantities scaled to the servings cooked. Idempotent (a meal is
 * consumed once), and a leftover meal consumes nothing.
 */
export async function markMealPrepared(householdId: string, mealId: string) {
  const meal = await prisma.plannedMeal.findFirst({
    where: { id: mealId, householdId },
    include: {
      recipe: { include: { ingredients: { include: { ingredient: true } } } },
    },
  });
  if (!meal) return { ok: false as const, error: "Repas introuvable." };
  if (meal.preparedAt) {
    return {
      ok: true as const,
      alreadyPrepared: true,
      label: describeSlot(meal.date, meal.mealSlot),
      changes: [],
    };
  }

  const uses = meal.leftoverOfId
    ? []
    : meal.recipe.ingredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: ri.quantity * meal.portionMultiplier,
      }));

  const pantry = await prisma.pantryItem.findMany({
    where: {
      householdId,
      ingredientId: { in: uses.map((u) => u.ingredientId) },
    },
    include: { ingredient: true },
  });
  const changes = computePantryConsumption(pantry, uses);
  const nameById = new Map(pantry.map((p) => [p.ingredientId, p.ingredient]));

  await prisma.$transaction([
    prisma.plannedMeal.update({
      where: { id: meal.id },
      data: { preparedAt: new Date() },
    }),
    ...changes.map((change) =>
      prisma.pantryItem.update({
        where: { ingredientId: change.ingredientId },
        data: { quantity: change.to },
      }),
    ),
  ]);

  return {
    ok: true as const,
    alreadyPrepared: false,
    label: describeSlot(meal.date, meal.mealSlot),
    changes: changes.map((change) => ({
      ...change,
      name: nameById.get(change.ingredientId)?.name ?? "?",
      unit: nameById.get(change.ingredientId)?.baseUnit ?? "GRAM",
    })),
  };
}

export async function findMealAt(
  householdId: string,
  dateKey: string,
  slot: MealSlot,
) {
  return prisma.plannedMeal.findUnique({
    where: {
      householdId_date_mealSlot: {
        householdId,
        date: dateFromKey(dateKey),
        mealSlot: slot,
      },
    },
  });
}
