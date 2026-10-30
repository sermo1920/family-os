import { prisma } from "@/lib/db";
import type {
  IngredientCategory,
  MealStatus,
  Unit,
} from "@/lib/generated/prisma/client";
import { addDays, toDateKey } from "@/features/meal-plan/dates";
import { dateFromKey } from "@/features/meal-plan/service";
import { aggregateIngredientUsages } from "@/features/shopping-list/aggregate";
import {
  isEmptyPlan,
  planShoppingListSync,
  type SyncPlan,
} from "@/features/shopping-list/sync";

export interface DateRange {
  startKey: string;
  endKeyInclusive: string;
}

/**
 * Aggregated ingredient requirements of the meals of a range. Only
 * VALIDATED meals by default (a proposed menu doesn't feed the shopping
 * list until it is validated), and never leftover meals (their ingredients
 * are already counted in the meal they come from).
 */
export async function computeRequirements(
  householdId: string,
  range: DateRange,
  options: { includeProposed?: boolean } = {},
) {
  const statuses: MealStatus[] = options.includeProposed
    ? ["VALIDATED", "PROPOSED"]
    : ["VALIDATED"];
  const meals = await prisma.plannedMeal.findMany({
    where: {
      householdId,
      date: {
        gte: dateFromKey(range.startKey),
        lt: addDays(dateFromKey(range.endKeyInclusive), 1),
      },
    },
    include: {
      recipe: { include: { ingredients: { include: { ingredient: true } } } },
    },
  });

  const counted = meals.filter(
    (meal) => statuses.includes(meal.status) && meal.leftoverOfId === null,
  );
  const usages = counted.flatMap((meal) =>
    meal.recipe.ingredients.map((ri) => ({
      ingredientId: ri.ingredientId,
      name: ri.ingredient.name,
      category: ri.ingredient.category,
      unit: ri.ingredient.baseUnit,
      quantity: ri.quantity * meal.portionMultiplier,
    })),
  );

  return {
    requirements: aggregateIngredientUsages(usages),
    countedMeals: counted.length,
    proposedMealsSkipped: options.includeProposed
      ? 0
      : meals.filter((m) => m.status === "PROPOSED").length,
    leftoverMeals: meals.filter((m) => m.leftoverOfId !== null).length,
  };
}

async function getStock(householdId: string) {
  const pantry = await prisma.pantryItem.findMany({ where: { householdId } });
  return pantry.map((p) => ({
    ingredientId: p.ingredientId,
    quantity: p.quantity,
  }));
}

/** What still has to be bought for a range, before touching any list. */
export async function computeNeeds(
  householdId: string,
  range: DateRange,
  options: { includeProposed?: boolean } = {},
) {
  const requirements = await computeRequirements(householdId, range, options);
  const stock = await getStock(householdId);
  const plan = planShoppingListSync(requirements.requirements, [], stock);
  return { ...requirements, toBuy: plan.create, plan };
}

export async function listShoppingListsSummary(householdId: string) {
  const lists = await prisma.shoppingList.findMany({
    where: { householdId },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { isChecked: true } } },
  });
  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    itemCount: list.items.length,
    checkedCount: list.items.filter((i) => i.isChecked).length,
    syncedRange:
      list.startDate && list.endDate
        ? { start: toDateKey(list.startDate), end: toDateKey(list.endDate) }
        : null,
  }));
}

export async function findShoppingList(
  householdId: string,
  ref: { listId?: string; name?: string },
) {
  if (ref.listId) {
    return prisma.shoppingList.findFirst({
      where: { id: ref.listId, householdId },
    });
  }
  if (ref.name) {
    return prisma.shoppingList.findFirst({
      where: {
        householdId,
        name: { equals: ref.name.trim(), mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  return null;
}

export async function findOrCreateShoppingList(
  householdId: string,
  name: string,
) {
  const existing = await findShoppingList(householdId, { name });
  if (existing) return { list: existing, created: false };
  const list = await prisma.shoppingList.create({
    data: { householdId, name: name.trim() },
  });
  return { list, created: true };
}

export type SyncResult =
  | {
      ok: true;
      applied: boolean;
      listId: string;
      listName: string;
      range: DateRange;
      plan: SyncPlan;
      countedMeals: number;
      proposedMealsSkipped: number;
    }
  | { ok: false; error: string };

/**
 * Previews (apply=false) or applies the synchronization of a list with the
 * meal plan of a range. The range is remembered on the list
 * (startDate/endDate) so a later re-sync — after a menu change — reuses it.
 * Computed and written inside one transaction, so two concurrent runs can't
 * both insert the same lines.
 */
export async function syncShoppingList(
  householdId: string,
  listId: string,
  options: {
    range?: DateRange;
    includeProposed?: boolean;
    apply: boolean;
  },
): Promise<SyncResult> {
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, householdId },
  });
  if (!list) return { ok: false, error: "Liste introuvable." };

  const range =
    options.range ??
    (list.startDate && list.endDate
      ? {
          startKey: toDateKey(list.startDate),
          endKeyInclusive: toDateKey(list.endDate),
        }
      : null);
  if (!range) {
    return {
      ok: false,
      error:
        "Aucune période associée à cette liste : précise les dates du menu à prendre en compte.",
    };
  }
  if (dateFromKey(range.endKeyInclusive) < dateFromKey(range.startKey)) {
    return {
      ok: false,
      error: "La date de fin doit être après la date de début.",
    };
  }

  const requirements = await computeRequirements(householdId, range, {
    includeProposed: options.includeProposed,
  });
  const stock = await getStock(householdId);

  const plan = await prisma.$transaction(async (tx) => {
    const items = await tx.shoppingListItem.findMany({
      where: { shoppingListId: list.id },
    });
    const computed = planShoppingListSync(
      requirements.requirements,
      items,
      stock,
    );
    if (!options.apply) return computed;

    if (computed.remove.length > 0) {
      await tx.shoppingListItem.deleteMany({
        where: {
          id: { in: computed.remove.map((r) => r.id) },
          shoppingListId: list.id,
        },
      });
    }
    for (const update of computed.update) {
      await tx.shoppingListItem.update({
        where: { id: update.id },
        data: { quantity: update.to, unit: update.unit },
      });
    }
    if (computed.create.length > 0) {
      await tx.shoppingListItem.createMany({
        data: computed.create.map((c) => ({
          shoppingListId: list.id,
          ingredientId: c.ingredientId,
          name: c.name,
          category: c.category,
          unit: c.unit,
          quantity: c.quantity,
          source: "MEAL_PLAN" as const,
        })),
      });
    }
    await tx.shoppingList.update({
      where: { id: list.id },
      data: {
        startDate: dateFromKey(range.startKey),
        endDate: dateFromKey(range.endKeyInclusive),
      },
    });
    return computed;
  });

  return {
    ok: true,
    applied: options.apply && !isEmptyPlan(plan),
    listId: list.id,
    listName: list.name,
    range,
    plan,
    countedMeals: requirements.countedMeals,
    proposedMealsSkipped: requirements.proposedMealsSkipped,
  };
}

export interface ManualItemInput {
  name: string;
  quantity: number;
  unit: Unit;
  category: IngredientCategory;
}

export async function addManualListItem(
  householdId: string,
  listId: string,
  input: ManualItemInput,
) {
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, householdId },
  });
  if (!list) return null;
  return prisma.shoppingListItem.create({
    data: { shoppingListId: list.id, ...input, source: "MANUAL" },
  });
}
