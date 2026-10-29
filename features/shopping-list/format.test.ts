import { describe, expect, it } from "vitest";
import { formatItemQuantity } from "@/features/shopping-list/format";

describe("formatItemQuantity", () => {
  it("shows the quantity with its short unit", () => {
    expect(formatItemQuantity({ quantity: 300, unit: "GRAM" })).toBe("300 g");
  });

  it("rounds to one decimal with a French decimal comma", () => {
    expect(formatItemQuantity({ quantity: 0.25, unit: "MILLILITER" })).toBe(
      "0,3 ml",
    );
  });

  it("hides the default single piece of an item added without quantity", () => {
    expect(formatItemQuantity({ quantity: 1, unit: "PIECE" })).toBeNull();
  });

  it("still shows several pieces", () => {
    expect(formatItemQuantity({ quantity: 3, unit: "PIECE" })).toBe("3 pce");
  });
});
