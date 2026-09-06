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
        category: "STARCHES",
        unit: "GRAM",
        quantity: 300,
      },
    ]);

    // Trié par ordre de catégorie "rayon de magasin" : FRUITS_VEGETABLES
    // vient avant STARCHES dans categoryLabels, peu importe l'ordre alphabétique.
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
        category: "STARCHES",
        unit: "GRAM",
        quantity: 300,
      },
    ]);
  });

  it("returns an empty list when there is nothing to aggregate", () => {
    expect(aggregateIngredientUsages([])).toEqual([]);
  });
});
