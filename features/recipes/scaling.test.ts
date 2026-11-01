import { describe, expect, it } from "vitest";
import {
  portionMultiplier,
  scaleIngredients,
  servingsFromMultiplier,
} from "@/features/recipes/scaling";

describe("scaleIngredients", () => {
  it("doubles every quantity when going from 2 to 4 servings", () => {
    const scaled = scaleIngredients(
      [
        { name: "Pâtes", quantity: 200, unit: "GRAM" as const },
        { name: "Crème", quantity: 100, unit: "MILLILITER" as const },
        { name: "Oignon", quantity: 1, unit: "PIECE" as const },
      ],
      2,
      4,
    );
    expect(scaled.map((i) => i.quantity)).toEqual([400, 200, 2]);
  });

  it("rounds odd ratios per unit", () => {
    const [onion] = scaleIngredients(
      [{ name: "Oignon", quantity: 1, unit: "PIECE" as const }],
      4,
      3,
    );
    expect(onion.quantity).toBe(1); // 0.75 -> nearest half
  });

  it("rejects non-positive servings", () => {
    expect(() => portionMultiplier(0, 4)).toThrow();
  });
});

describe("servingsFromMultiplier", () => {
  it("recovers the servings cooked from a stored multiplier", () => {
    expect(servingsFromMultiplier(2, 2)).toBe(4);
    expect(servingsFromMultiplier(4, 1.5)).toBe(6);
  });
});
