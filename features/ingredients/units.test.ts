import { describe, expect, it } from "vitest";
import {
  convertToUnit,
  normalizeQuantity,
  roundPurchaseQuantity,
  roundQuantity,
} from "@/features/ingredients/units";

describe("normalizeQuantity", () => {
  it("converts metric weights and volumes to base units", () => {
    expect(normalizeQuantity(1.5, "kg")).toEqual({
      quantity: 1500,
      unit: "GRAM",
    });
    expect(normalizeQuantity(2, "dl")).toEqual({
      quantity: 200,
      unit: "MILLILITER",
    });
    expect(normalizeQuantity(1, "L")).toEqual({
      quantity: 1000,
      unit: "MILLILITER",
    });
  });

  it("converts spoons to milliliters", () => {
    expect(normalizeQuantity(2, "c. à soupe")).toEqual({
      quantity: 30,
      unit: "MILLILITER",
    });
    expect(normalizeQuantity(1, "càc")).toEqual({
      quantity: 5,
      unit: "MILLILITER",
    });
  });

  it("accepts base unit names and countable aliases", () => {
    expect(normalizeQuantity(3, "PIECE")).toEqual({
      quantity: 3,
      unit: "PIECE",
    });
    expect(normalizeQuantity(1, "sachet")).toEqual({
      quantity: 1,
      unit: "PACK",
    });
  });

  it("returns null for an unknown unit instead of guessing", () => {
    expect(normalizeQuantity(1, "poignée")).toBeNull();
  });
});

describe("convertToUnit", () => {
  it("never converts between weight and volume", () => {
    expect(convertToUnit(100, "GRAM", "MILLILITER")).toBeNull();
    expect(convertToUnit(100, "GRAM", "GRAM")).toBe(100);
  });
});

describe("rounding", () => {
  it("rounds display quantities sensibly", () => {
    expect(roundQuantity(333.333, "GRAM")).toBe(333);
    expect(roundQuantity(2.345, "MILLILITER")).toBe(2.3);
    expect(roundQuantity(1.3, "PIECE")).toBe(1.5);
  });

  it("rounds countable purchases up", () => {
    expect(roundPurchaseQuantity(1.2, "PIECE")).toBe(2);
    expect(roundPurchaseQuantity(2, "PACK")).toBe(2);
    expect(roundPurchaseQuantity(150.4, "GRAM")).toBe(150);
  });
});
