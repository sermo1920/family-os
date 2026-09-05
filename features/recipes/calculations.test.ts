import { describe, expect, it } from "vitest";
import {
  computeNutritionPerPortion,
  computeRecipeNutritionTotal,
} from "@/features/recipes/calculations";

describe("computeRecipeNutritionTotal", () => {
  it("sums two ingredients scaled by their quantity", () => {
    // A: 200g @ 150 kcal/100g -> 300 kcal, 20g protein, 40g carbs, 10g fat
    // B: 100g @ 250 kcal/100g -> 250 kcal, 5g protein, 30g carbs, 8g fat
    const total = computeRecipeNutritionTotal([
      {
        quantity: 200,
        caloriesPer100: 150,
        proteinPer100: 10,
        carbsPer100: 20,
        fatPer100: 5,
      },
      {
        quantity: 100,
        caloriesPer100: 250,
        proteinPer100: 5,
        carbsPer100: 30,
        fatPer100: 8,
      },
    ]);

    expect(total).toEqual({
      calories: 550,
      proteinG: 25,
      carbsG: 70,
      fatG: 18,
    });
  });

  it("returns all zeros for an empty ingredient list", () => {
    expect(computeRecipeNutritionTotal([])).toEqual({
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});

describe("computeNutritionPerPortion", () => {
  it("divides the total across servings and rounds", () => {
    // 550/4 = 137.5 -> 138, 25/4 = 6.25 -> 6, 70/4 = 17.5 -> 18, 18/4 = 4.5 -> 5
    const perPortion = computeNutritionPerPortion(
      { calories: 550, proteinG: 25, carbsG: 70, fatG: 18 },
      4,
    );

    expect(perPortion).toEqual({
      calories: 138,
      proteinG: 6,
      carbsG: 18,
      fatG: 5,
    });
  });

  it("throws for a non-positive number of servings", () => {
    expect(() =>
      computeNutritionPerPortion(
        { calories: 100, proteinG: 1, carbsG: 1, fatG: 1 },
        0,
      ),
    ).toThrow();
  });
});
