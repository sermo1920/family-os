import { shortUnitLabels } from "@/features/ingredients/schema";
import type { Unit } from "@/lib/generated/prisma/client";

const quantityFormatter = new Intl.NumberFormat("fr-CH", {
  maximumFractionDigits: 1,
});

/**
 * Quantity shown after an item's name ("300 g"), or null when there is
 * nothing worth showing: an item added without a quantity is stored as
 * "1 piece" (see addManualItem) and is displayed as its name alone.
 */
export function formatItemQuantity(item: {
  quantity: number;
  unit: Unit;
}): string | null {
  if (item.quantity === 1 && item.unit === "PIECE") return null;
  return `${quantityFormatter.format(item.quantity)} ${shortUnitLabels[item.unit]}`;
}
