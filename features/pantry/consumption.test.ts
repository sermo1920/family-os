import { describe, expect, it } from "vitest";
import { computePantryConsumption } from "@/features/pantry/consumption";

describe("computePantryConsumption", () => {
  it("decrements known quantities and never goes below zero", () => {
    expect(
      computePantryConsumption(
        [
          { ingredientId: "chicken", quantity: 500 },
          { ingredientId: "zucchini", quantity: 1 },
        ],
        [
          { ingredientId: "chicken", quantity: 300 },
          { ingredientId: "zucchini", quantity: 2 },
        ],
      ),
    ).toEqual([
      { ingredientId: "chicken", from: 500, to: 200 },
      { ingredientId: "zucchini", from: 1, to: 0 },
    ]);
  });

  it("leaves unknown quantities and unused entries alone", () => {
    expect(
      computePantryConsumption(
        [
          { ingredientId: "salt", quantity: null },
          { ingredientId: "rice", quantity: 1000 },
        ],
        [{ ingredientId: "salt", quantity: 5 }],
      ),
    ).toEqual([]);
  });
});
