import { prisma } from "@/lib/db";
import type { IngredientCategory, Unit } from "@/lib/generated/prisma/client";

export async function listShoppingLists(householdId: string) {
  return prisma.shoppingList.findMany({
    where: { householdId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getShoppingListWithItems(shoppingListId: string) {
  return prisma.shoppingList.findUnique({
    where: { id: shoppingListId },
    include: {
      items: { orderBy: [{ category: "asc" }, { name: "asc" }] },
    },
  });
}

export interface KnownShoppingItem {
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: Unit;
}

/**
 * Articles déjà ajoutés à la main (jamais ceux issus d'une recette, qui
 * viennent du catalogue d'ingrédients) sur une liste de courses du foyer,
 * dédupliqués par nom (le plus récent gagne) — sert de "mémoire" pour
 * pré-remplir catégorie/quantité/unité quand on retape un nom déjà utilisé.
 */
export async function listKnownShoppingItems(
  householdId: string,
): Promise<KnownShoppingItem[]> {
  const items = await prisma.shoppingListItem.findMany({
    where: { shoppingList: { householdId }, ingredientId: null },
    orderBy: { createdAt: "desc" },
    select: { name: true, category: true, quantity: true, unit: true },
  });

  const seen = new Map<string, KnownShoppingItem>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}
