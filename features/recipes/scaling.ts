import type { Unit } from "@/lib/generated/prisma/client";
import { roundQuantity } from "@/features/ingredients/units";

export interface ScalableIngredient {
  name: string;
  quantity: number;
  unit: Unit;
}

/** Ratio used everywhere a recipe is cooked for another number of servings. */
export function portionMultiplier(
  recipeServings: number,
  targetServings: number,
): number {
  if (recipeServings <= 0 || targetServings <= 0) {
    throw new Error("Le nombre de portions doit être positif.");
  }
  return targetServings / recipeServings;
}

/** Servings actually cooked for a planned meal (recipe servings × multiplier). */
export function servingsFromMultiplier(
  recipeServings: number,
  multiplier: number,
): number {
  return Math.round(recipeServings * multiplier * 100) / 100;
}

/** Scales a recipe's ingredient list from its own servings to `targetServings`. */
export function scaleIngredients<T extends ScalableIngredient>(
  ingredients: T[],
  recipeServings: number,
  targetServings: number,
): T[] {
  const factor = portionMultiplier(recipeServings, targetServings);
  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: roundQuantity(ingredient.quantity * factor, ingredient.unit),
  }));
}
