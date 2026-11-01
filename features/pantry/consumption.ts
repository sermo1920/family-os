/**
 * Stock consumed when a planned meal is explicitly marked as prepared
 * (never when it is merely planned). Pure: returns the new quantity per
 * pantry entry; entries with an unknown quantity stay unknown.
 */

export interface PantryQuantity {
  ingredientId: string;
  quantity: number | null;
}

export interface IngredientUse {
  ingredientId: string;
  /** Already scaled to the servings cooked, in the ingredient's base unit. */
  quantity: number;
}

export interface PantryChange {
  ingredientId: string;
  from: number;
  to: number;
}

export function computePantryConsumption(
  pantry: PantryQuantity[],
  uses: IngredientUse[],
): PantryChange[] {
  const usedByIngredient = new Map<string, number>();
  for (const use of uses) {
    usedByIngredient.set(
      use.ingredientId,
      (usedByIngredient.get(use.ingredientId) ?? 0) + use.quantity,
    );
  }

  const changes: PantryChange[] = [];
  for (const entry of pantry) {
    const used = usedByIngredient.get(entry.ingredientId);
    if (used === undefined || entry.quantity === null) continue;
    const to = Math.max(0, Math.round((entry.quantity - used) * 10) / 10);
    if (to !== entry.quantity) {
      changes.push({
        ingredientId: entry.ingredientId,
        from: entry.quantity,
        to,
      });
    }
  }
  return changes;
}
