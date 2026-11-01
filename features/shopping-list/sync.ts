import type {
  IngredientCategory,
  ShoppingItemSource,
  Unit,
} from "@/lib/generated/prisma/client";
import { roundPurchaseQuantity } from "@/features/ingredients/units";
import type { AggregatedIngredient } from "@/features/shopping-list/aggregate";

/**
 * Pure planning of a shopping list synchronization with the meal plan.
 *
 * Rules (see CLAUDE.md, "Liste de courses"):
 * - MANUAL items are never touched.
 * - Checked (already bought) items are never touched; they count as already
 *   covering part of the requirement, so only the remainder is added.
 * - Known stock is deducted; stock with an unknown quantity is NOT deducted
 *   (we never assume something is available), only reported.
 * - Unchecked MEAL_PLAN items are set to exactly what is still needed, so
 *   running the same sync twice yields an empty plan (no duplicates).
 */

export interface ExistingListItem {
  id: string;
  ingredientId: string | null;
  name: string;
  quantity: number;
  unit: Unit;
  isChecked: boolean;
  source: ShoppingItemSource;
}

export interface StockEntry {
  ingredientId: string;
  /** In the ingredient's base unit; null = present, quantity unknown. */
  quantity: number | null;
}

export interface SyncPlan {
  create: {
    ingredientId: string;
    name: string;
    category: IngredientCategory;
    unit: Unit;
    quantity: number;
  }[];
  update: {
    id: string;
    name: string;
    unit: Unit;
    from: number;
    to: number;
  }[];
  remove: { id: string; name: string; unit: Unit; quantity: number }[];
  /** Requirement fully or partly covered by known stock. */
  stockUsed: { name: string; unit: Unit; needed: number; inStock: number }[];
  /** In stock but quantity unknown: still added to the list, flagged. */
  stockUnknown: { name: string }[];
  /** Manual items with the same name as a required ingredient (left as is). */
  possibleManualDuplicates: { name: string }[];
  keptManualCount: number;
  keptCheckedCount: number;
}

export function isEmptyPlan(plan: SyncPlan): boolean {
  return (
    plan.create.length === 0 &&
    plan.update.length === 0 &&
    plan.remove.length === 0
  );
}

export function planShoppingListSync(
  requirements: AggregatedIngredient[],
  existingItems: ExistingListItem[],
  stock: StockEntry[],
): SyncPlan {
  const plan: SyncPlan = {
    create: [],
    update: [],
    remove: [],
    stockUsed: [],
    stockUnknown: [],
    possibleManualDuplicates: [],
    keptManualCount: 0,
    keptCheckedCount: 0,
  };

  const stockByIngredient = new Map(stock.map((s) => [s.ingredientId, s]));
  const planItemsByIngredient = new Map<string, ExistingListItem[]>();
  const manualNames = new Set<string>();

  for (const item of existingItems) {
    if (item.source === "MANUAL") {
      plan.keptManualCount += 1;
      manualNames.add(item.name.trim().toLowerCase());
      continue;
    }
    if (item.isChecked) plan.keptCheckedCount += 1;
    // A generated item whose ingredient was deleted can't be matched any
    // more: leave it alone rather than guess.
    if (!item.ingredientId) continue;
    const list = planItemsByIngredient.get(item.ingredientId) ?? [];
    list.push(item);
    planItemsByIngredient.set(item.ingredientId, list);
  }

  const required = new Set<string>();

  for (const requirement of requirements) {
    required.add(requirement.ingredientId);
    const items = planItemsByIngredient.get(requirement.ingredientId) ?? [];
    const checkedQuantity = items
      .filter((i) => i.isChecked && i.unit === requirement.unit)
      .reduce((sum, i) => sum + i.quantity, 0);
    const unchecked = items.filter((i) => !i.isChecked);

    let needed = requirement.quantity;
    const stockEntry = stockByIngredient.get(requirement.ingredientId);
    if (stockEntry) {
      if (stockEntry.quantity === null) {
        plan.stockUnknown.push({ name: requirement.name });
      } else if (stockEntry.quantity > 0) {
        plan.stockUsed.push({
          name: requirement.name,
          unit: requirement.unit,
          needed: roundPurchaseQuantity(requirement.quantity, requirement.unit),
          inStock: stockEntry.quantity,
        });
        needed -= stockEntry.quantity;
      }
    }
    needed -= checkedQuantity;

    if (manualNames.has(requirement.name.trim().toLowerCase())) {
      plan.possibleManualDuplicates.push({ name: requirement.name });
    }

    const target =
      needed > 1e-9 ? roundPurchaseQuantity(needed, requirement.unit) : 0;

    const [first, ...extra] = unchecked;
    for (const item of extra) {
      plan.remove.push({
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
      });
    }

    if (target > 0) {
      if (!first) {
        plan.create.push({
          ingredientId: requirement.ingredientId,
          name: requirement.name,
          category: requirement.category,
          unit: requirement.unit,
          quantity: target,
        });
      } else if (first.quantity !== target || first.unit !== requirement.unit) {
        plan.update.push({
          id: first.id,
          name: first.name,
          unit: requirement.unit,
          from: first.quantity,
          to: target,
        });
      }
    } else if (first) {
      plan.remove.push({
        id: first.id,
        name: first.name,
        unit: first.unit,
        quantity: first.quantity,
      });
    }
  }

  // Ingredients no longer needed by the menu: drop what wasn't bought yet.
  for (const [ingredientId, items] of planItemsByIngredient) {
    if (required.has(ingredientId)) continue;
    for (const item of items) {
      if (item.isChecked) continue;
      plan.remove.push({
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
      });
    }
  }

  return plan;
}
