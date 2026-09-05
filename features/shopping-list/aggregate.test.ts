import { describe, expect, it } from "vitest";
import { aggregateIngredientUsages } from "@/features/shopping-list/aggregate";

describe("aggregateIngredientUsages", () => {
  it("merges the same ingredient used by two different recipes into one line", () => {
    const result = aggregateIngredientUsages([
      {
        ingredientId: "onion",
        name: "Oignon",
        category: "FRUITS_VEGETABLES",
        unit: "GRAM",
        quantity: 200, // recette A
      },
      {
        ingredientId: "onion",
        name: "Oignon",
        category: "FRUITS_VEGETABLES",
        unit: "GRAM",
        quantity: 100, // recette B, même ingrédient
      },
      {
        ingredientId: "rice",
        name: "Riz",
        category: "GROCERY",
        unit: "GRAM",
        quantity: 300,
      },
    ]);

    // Trié par catégorie : "FRUITS_VEGETABLES" < "GROCERY" alphabétiquement.
    expect(result).toEqual([
      {
        ingredientId: "onion",
        name: "Oignon",
        category: "FRUITS_VEGETABLES",
        unit: "GRAM",
        quantity: 300,
      },
      {
        ingredientId: "rice",
        name: "Riz",
        category: "GROCERY",
        unit: "GRAM",
        quantity: 300,
      },
    ]);
  });

  it("returns an empty list when there is nothing to aggregate", () => {
    expect(aggregateIngredientUsages([])).toEqual([]);
  });
});
