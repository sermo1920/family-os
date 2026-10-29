"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import {
  createListSchema,
  manualItemSchema,
  syncListSchema,
} from "@/features/shopping-list/schema";
import { syncShoppingList } from "@/features/shopping-list/service";
import { formatQuantity } from "@/features/recipes/service";

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

export interface SyncPreview {
  applied: boolean;
  range: { startKey: string; endKeyInclusive: string };
  countedMeals: number;
  proposedMealsSkipped: number;
  create: string[];
  update: string[];
  remove: string[];
  keptManualCount: number;
  keptCheckedCount: number;
  stockUsed: string[];
  stockUnknown: string[];
  possibleManualDuplicates: string[];
}

export type SyncActionState = {
  error: string | null;
  preview: SyncPreview | null;
};

/**
 * Synchronise une liste avec le menu d'une période (voir
 * features/shopping-list/sync.ts) : `intent=preview` montre les changements
 * sans rien écrire, `intent=apply` les applique. Idempotent : relancer ne
 * crée pas de doublon ; articles manuels et articles cochés préservés.
 */
export async function syncShoppingListAction(
  shoppingListId: string,
  _prevState: SyncActionState,
  formData: FormData,
): Promise<SyncActionState> {
  const shoppingList = await prisma.shoppingList.findUniqueOrThrow({
    where: { id: shoppingListId },
  });
  await assertHouseholdAccess(shoppingList.householdId);

  const parsed = syncListSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Champs invalides",
      preview: null,
    };
  }

  const result = await syncShoppingList(
    shoppingList.householdId,
    shoppingListId,
    {
      range: {
        startKey: parsed.data.startDate,
        endKeyInclusive: parsed.data.endDate,
      },
      includeProposed: formData.get("includeProposed") === "on",
      apply: formData.get("intent") === "apply",
    },
  );
  if (!result.ok) return { error: result.error, preview: null };

  const { plan } = result;
  if (formData.get("intent") === "apply") {
    revalidatePath(`/shopping-lists/${shoppingListId}`);
  }
  return {
    error: null,
    preview: {
      applied: formData.get("intent") === "apply",
      range: result.range,
      countedMeals: result.countedMeals,
      proposedMealsSkipped: result.proposedMealsSkipped,
      create: plan.create.map(
        (c) => `${c.name} ${formatQuantity(c.quantity, c.unit)}`,
      ),
      update: plan.update.map(
        (u) =>
          `${u.name} : ${formatQuantity(u.from, u.unit)} → ${formatQuantity(u.to, u.unit)}`,
      ),
      remove: plan.remove.map(
        (r) => `${r.name} ${formatQuantity(r.quantity, r.unit)}`,
      ),
      keptManualCount: plan.keptManualCount,
      keptCheckedCount: plan.keptCheckedCount,
      stockUsed: plan.stockUsed.map((st) => st.name),
      stockUnknown: plan.stockUnknown.map((st) => st.name),
      possibleManualDuplicates: plan.possibleManualDuplicates.map(
        (d) => d.name,
      ),
    },
  };
}

export async function updateItemQuantity(
  itemId: string,
  quantity: number,
): Promise<{ error: string | null }> {
  const item = await getShoppingListIdForItem(itemId);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "La quantité doit être positive." };
  }
  await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: { quantity: Math.round(quantity * 10) / 10 },
  });
  revalidatePath(`/shopping-lists/${item.shoppingListId}`);
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
    data: { shoppingListId, ...parsed.data, source: "MANUAL" },
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
