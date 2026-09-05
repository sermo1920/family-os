export interface IngredientNutrition {
  /** Quantité dans l'unité de base de l'ingrédient (grammes ou millilitres). */
  quantity: number;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
}

export interface RecipeNutrition {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const EMPTY_TOTAL: RecipeNutrition = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

/** Nutrition totale d'une recette : somme des ingrédients ramenés à leur quantité réelle. */
export function computeRecipeNutritionTotal(
  ingredients: IngredientNutrition[],
): RecipeNutrition {
  return ingredients.reduce((total, ingredient) => {
    const factor = ingredient.quantity / 100;
    return {
      calories: total.calories + ingredient.caloriesPer100 * factor,
      proteinG: total.proteinG + ingredient.proteinPer100 * factor,
      carbsG: total.carbsG + ingredient.carbsPer100 * factor,
      fatG: total.fatG + ingredient.fatPer100 * factor,
    };
  }, EMPTY_TOTAL);
}

/** Répartit la nutrition totale d'une recette sur son nombre de portions. */
export function computeNutritionPerPortion(
  total: RecipeNutrition,
  servings: number,
): RecipeNutrition {
  if (servings <= 0) {
    throw new Error("Le nombre de portions doit être positif.");
  }
  return {
    calories: Math.round(total.calories / servings),
    proteinG: Math.round(total.proteinG / servings),
    carbsG: Math.round(total.carbsG / servings),
    fatG: Math.round(total.fatG / servings),
  };
}
