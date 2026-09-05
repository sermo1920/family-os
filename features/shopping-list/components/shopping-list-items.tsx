"use client";

import { useOptimistic, useTransition } from "react";
import { toggleItem, deleteItem } from "@/features/shopping-list/actions";
import { categoryLabels } from "@/features/ingredients/schema";
import type { getShoppingListWithItems } from "@/features/shopping-list/queries";

type ShoppingListWithItems = NonNullable<
  Awaited<ReturnType<typeof getShoppingListWithItems>>
>;
type Item = ShoppingListWithItems["items"][number];

const shortUnitLabels = { GRAM: "g", MILLILITER: "ml" } as const;

type OptimisticAction =
  { type: "toggle"; id: string } | { type: "delete"; id: string };

export function ShoppingListItems({ items: initialItems }: { items: Item[] }) {
  const [, startTransition] = useTransition();
  const [items, updateOptimistic] = useOptimistic(
    initialItems,
    (state, action: OptimisticAction) => {
      if (action.type === "toggle") {
        return state.map((item) =>
          item.id === action.id
            ? { ...item, isChecked: !item.isChecked }
            : item,
        );
      }
      return state.filter((item) => item.id !== action.id);
    },
  );

  function handleToggle(item: Item) {
    startTransition(async () => {
      updateOptimistic({ type: "toggle", id: item.id });
      await toggleItem(item.id);
    });
  }

  function handleDelete(item: Item) {
    startTransition(async () => {
      updateOptimistic({ type: "delete", id: item.id });
      await deleteItem(item.id);
    });
  }

  const grouped = new Map<string, Item[]>();
  for (const item of items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Liste vide.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(grouped.entries()).map(([category, categoryItems]) => (
        <div key={category}>
          <h3 className="mb-1 text-sm font-medium">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h3>
          <ul className="flex flex-col gap-1">
            {categoryItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.isChecked}
                  onChange={() => handleToggle(item)}
                />
                <span
                  className={
                    item.isChecked
                      ? "text-muted-foreground flex-1 line-through"
                      : "flex-1"
                  }
                >
                  {item.name} — {item.quantity} {shortUnitLabels[item.unit]}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
