import type { IngredientCategory, Unit } from "@/lib/generated/prisma/client";
import { categoryLabels } from "@/features/ingredients/schema";

const categoryOrder = Object.keys(categoryLabels) as IngredientCategory[];

export interface IngredientUsage {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  unit: Unit;
  /** Déjà mise à l'échelle par le multiplicateur de portions du repas planifié. */
  quantity: number;
}

export interface AggregatedIngredient {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  unit: Unit;
  quantity: number;
}

/**
 * Regroupe les usages d'ingrédients par ingrédient : si deux repas planifiés
 * (même avec des recettes différentes) utilisent le même ingrédient, leurs
 * quantités sont additionnées en une seule ligne plutôt que dupliquées.
 */
export function aggregateIngredientUsages(
  usages: IngredientUsage[],
): AggregatedIngredient[] {
  const byIngredient = new Map<string, AggregatedIngredient>();

  for (const usage of usages) {
    const existing = byIngredient.get(usage.ingredientId);
    if (existing) {
      existing.quantity += usage.quantity;
    } else {
      byIngredient.set(usage.ingredientId, { ...usage });
    }
  }

  return Array.from(byIngredient.values()).sort(
    (a, b) =>
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
      a.name.localeCompare(b.name),
  );
}
