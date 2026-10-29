"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  toggleItem,
  deleteItem,
  updateItemQuantity,
} from "@/features/shopping-list/actions";
import { categoryLabels, shortUnitLabels } from "@/features/ingredients/schema";
import type { getShoppingListWithItems } from "@/features/shopping-list/queries";

type ShoppingListWithItems = NonNullable<
  Awaited<ReturnType<typeof getShoppingListWithItems>>
>;
type Item = ShoppingListWithItems["items"][number];

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
                      ? "text-muted-foreground flex min-w-0 flex-1 flex-wrap items-center gap-x-1 line-through"
                      : "flex min-w-0 flex-1 flex-wrap items-center gap-x-1"
                  }
                >
                  <span>{item.name} —</span>
                  <QuantityEditor item={item} />
                  {item.source === "MANUAL" && (
                    <span className="text-muted-foreground text-[10px] no-underline">
                      (manuel)
                    </span>
                  )}
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

function QuantityEditor({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.quantity));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const quantity = Number(value);
    if (quantity === item.quantity) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updateItemQuantity(item.id, quantity);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(item.quantity));
          setEditing(true);
        }}
        className="hover:bg-muted rounded px-1 underline decoration-dotted underline-offset-2"
        aria-label={`Modifier la quantité de ${item.name}`}
      >
        {item.quantity} {shortUnitLabels[item.unit]}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={0}
        step="0.1"
        autoFocus
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="border-input h-6 w-20 rounded border bg-transparent px-1 text-sm"
        aria-label={`Quantité de ${item.name}`}
      />
      {shortUnitLabels[item.unit]}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </span>
  );
}
