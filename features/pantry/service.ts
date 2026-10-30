import { prisma } from "@/lib/db";
import type { IngredientCategory } from "@/lib/generated/prisma/client";
import { normalizeQuantity } from "@/features/ingredients/units";
import { shortUnitLabels } from "@/features/ingredients/schema";

export async function listPantry(householdId: string) {
  return prisma.pantryItem.findMany({
    where: { householdId },
    include: { ingredient: true },
    orderBy: { ingredient: { name: "asc" } },
  });
}

export interface SetPantryInput {
  name: string;
  /** null/undefined = present, quantity unknown. */
  quantity?: number | null;
  unit?: string | null;
  category?: IngredientCategory;
}

export type SetPantryResult =
  | {
      ok: true;
      name: string;
      quantity: number | null;
      unitLabel: string;
      createdIngredient: boolean;
    }
  | { ok: false; error: string };

/**
 * Sets the stock of an ingredient (find-or-create in the catalogue). The
 * quantity is converted into the ingredient's base unit; an incompatible
 * unit is refused rather than guessed.
 */
export async function setPantryItem(
  householdId: string,
  input: SetPantryInput,
): Promise<SetPantryResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nom requis." };

  let normalized: ReturnType<typeof normalizeQuantity> = null;
  if (input.quantity !== null && input.quantity !== undefined) {
    if (input.quantity < 0) return { ok: false, error: "Quantité invalide." };
    normalized = normalizeQuantity(input.quantity, input.unit);
    if (!normalized) {
      return { ok: false, error: `Unité inconnue « ${input.unit} ».` };
    }
  }

  let ingredient = await prisma.ingredient.findFirst({
    where: { householdId, name: { equals: name, mode: "insensitive" } },
  });
  let createdIngredient = false;
  if (ingredient && normalized && ingredient.baseUnit !== normalized.unit) {
    return {
      ok: false,
      error: `« ${ingredient.name} » est suivi en ${shortUnitLabels[ingredient.baseUnit]} : indique la quantité dans cette unité.`,
    };
  }
  if (!ingredient) {
    ingredient = await prisma.ingredient.create({
      data: {
        householdId,
        name,
        category: input.category ?? "OTHER",
        // Without a quantity the unit still tells how the ingredient is
        // counted (e.g. "GRAM" chosen in the form).
        baseUnit:
          normalized?.unit ?? normalizeQuantity(1, input.unit)?.unit ?? "PIECE",
      },
    });
    createdIngredient = true;
  }

  const quantity = normalized ? normalized.quantity : null;
  await prisma.pantryItem.upsert({
    where: { ingredientId: ingredient.id },
    create: { householdId, ingredientId: ingredient.id, quantity },
    update: { quantity },
  });

  return {
    ok: true,
    name: ingredient.name,
    quantity,
    unitLabel: shortUnitLabels[ingredient.baseUnit],
    createdIngredient,
  };
}

export async function removePantryItem(householdId: string, name: string) {
  const item = await prisma.pantryItem.findFirst({
    where: {
      householdId,
      ingredient: { name: { equals: name.trim(), mode: "insensitive" } },
    },
    include: { ingredient: true },
  });
  if (!item) return null;
  await prisma.pantryItem.delete({ where: { id: item.id } });
  return item.ingredient.name;
}

export async function removePantryItemById(householdId: string, id: string) {
  const item = await prisma.pantryItem.findFirst({
    where: { id, householdId },
  });
  if (!item) return null;
  await prisma.pantryItem.delete({ where: { id } });
  return item;
}
