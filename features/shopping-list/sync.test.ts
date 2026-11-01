import { describe, expect, it } from "vitest";
import {
  isEmptyPlan,
  planShoppingListSync,
  type ExistingListItem,
  type SyncPlan,
} from "@/features/shopping-list/sync";
import type { AggregatedIngredient } from "@/features/shopping-list/aggregate";

const pasta: AggregatedIngredient = {
  ingredientId: "pasta",
  name: "Pâtes",
  category: "STARCHES",
  unit: "GRAM",
  quantity: 400,
};
const lemon: AggregatedIngredient = {
  ingredientId: "lemon",
  name: "Citron",
  category: "FRUITS_VEGETABLES",
  unit: "PIECE",
  quantity: 1.5,
};

/** Applies a plan to an in-memory list, like the server action does in DB. */
function apply(items: ExistingListItem[], plan: SyncPlan): ExistingListItem[] {
  const removed = new Set(plan.remove.map((r) => r.id));
  const updated = new Map(plan.update.map((u) => [u.id, u]));
  return [
    ...items
      .filter((i) => !removed.has(i.id))
      .map((i) =>
        updated.has(i.id) ? { ...i, quantity: updated.get(i.id)!.to } : i,
      ),
    ...plan.create.map((c, index) => ({
      id: `new-${index}`,
      ingredientId: c.ingredientId,
      name: c.name,
      quantity: c.quantity,
      unit: c.unit,
      isChecked: false,
      source: "MEAL_PLAN" as const,
    })),
  ];
}

describe("planShoppingListSync", () => {
  it("creates one line per required ingredient, rounding pieces up", () => {
    const plan = planShoppingListSync([pasta, lemon], [], []);
    expect(plan.create.map((c) => [c.name, c.quantity])).toEqual([
      ["Pâtes", 400],
      ["Citron", 2],
    ]);
  });

  it("is idempotent: running it again changes nothing", () => {
    const first = planShoppingListSync([pasta, lemon], [], []);
    const items = apply([], first);
    const second = planShoppingListSync([pasta, lemon], items, []);
    expect(isEmptyPlan(second)).toBe(true);
  });

  it("never touches manual items, even when the menu changes", () => {
    const manual: ExistingListItem = {
      id: "m1",
      ingredientId: null,
      name: "Papier toilette",
      quantity: 1,
      unit: "PACK",
      isChecked: false,
      source: "MANUAL",
    };
    const items = apply([manual], planShoppingListSync([pasta], [manual], []));
    const plan = planShoppingListSync([lemon], items, []);
    expect(plan.remove.map((r) => r.name)).toEqual(["Pâtes"]);
    expect(plan.remove.some((r) => r.id === "m1")).toBe(false);
    expect(plan.keptManualCount).toBe(1);
  });

  it("keeps checked items and only adds the remainder", () => {
    const bought: ExistingListItem = {
      id: "b1",
      ingredientId: "pasta",
      name: "Pâtes",
      quantity: 250,
      unit: "GRAM",
      isChecked: true,
      source: "MEAL_PLAN",
    };
    const plan = planShoppingListSync([pasta], [bought], []);
    expect(plan.create).toEqual([expect.objectContaining({ quantity: 150 })]);
    expect(plan.remove).toEqual([]);
    expect(plan.keptCheckedCount).toBe(1);
  });

  it("keeps checked items even when no longer needed", () => {
    const bought: ExistingListItem = {
      id: "b1",
      ingredientId: "pasta",
      name: "Pâtes",
      quantity: 400,
      unit: "GRAM",
      isChecked: true,
      source: "MEAL_PLAN",
    };
    const plan = planShoppingListSync([], [bought], []);
    expect(isEmptyPlan(plan)).toBe(true);
  });

  it("deducts known stock but not stock of unknown quantity", () => {
    const plan = planShoppingListSync(
      [pasta, lemon],
      [],
      [
        { ingredientId: "pasta", quantity: 300 },
        { ingredientId: "lemon", quantity: null },
      ],
    );
    expect(plan.create.map((c) => [c.name, c.quantity])).toEqual([
      ["Pâtes", 100],
      ["Citron", 2],
    ]);
    expect(plan.stockUnknown).toEqual([{ name: "Citron" }]);
  });

  it("skips an ingredient fully covered by stock", () => {
    const plan = planShoppingListSync(
      [pasta],
      [],
      [{ ingredientId: "pasta", quantity: 500 }],
    );
    expect(plan.create).toEqual([]);
    expect(plan.stockUsed).toHaveLength(1);
  });

  it("updates an existing unchecked line instead of adding a second one", () => {
    const existing: ExistingListItem = {
      id: "p1",
      ingredientId: "pasta",
      name: "Pâtes",
      quantity: 200,
      unit: "GRAM",
      isChecked: false,
      source: "MEAL_PLAN",
    };
    const plan = planShoppingListSync([pasta], [existing], []);
    expect(plan.create).toEqual([]);
    expect(plan.update).toEqual([
      { id: "p1", name: "Pâtes", unit: "GRAM", from: 200, to: 400 },
    ]);
  });
});
