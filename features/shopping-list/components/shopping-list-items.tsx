"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CheckIcon, ChevronDownIcon, Trash2Icon } from "lucide-react";
import {
  toggleItem,
  deleteItem,
  updateItemQuantity,
} from "@/features/shopping-list/actions";
import {
  categoryEmojis,
  categoryLabels,
  shortUnitLabels,
} from "@/features/ingredients/schema";
import { formatItemQuantity } from "@/features/shopping-list/format";
import type { getShoppingListWithItems } from "@/features/shopping-list/queries";
import { cn } from "@/lib/utils";

type ShoppingListWithItems = NonNullable<
  Awaited<ReturnType<typeof getShoppingListWithItems>>
>;
type Item = ShoppingListWithItems["items"][number];
type Category = Item["category"];

type OptimisticAction =
  { type: "toggle"; id: string } | { type: "delete"; id: string };

export function ShoppingListItems({ items: initialItems }: { items: Item[] }) {
  const [, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState<Set<Category>>(new Set());
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

  function toggleCategory(category: Category) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  // Items arrive sorted by category (enum order = categoryLabels order), so
  // insertion order of the Map keeps the supermarket aisle order.
  const grouped = new Map<Category, Item[]>();
  for (const item of items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Liste vide. Ajoutez un premier article ci-dessus.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(grouped.entries()).map(([category, categoryItems]) => {
        const isCollapsed = collapsed.has(category);
        return (
          <section key={category} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              aria-expanded={!isCollapsed}
              className="flex items-center gap-2 py-1 text-left text-lg font-semibold"
            >
              <span>{categoryLabels[category]}</span>
              <span aria-hidden>{categoryEmojis[category]}</span>
              <span>{categoryItems.length}</span>
              <ChevronDownIcon
                className={cn(
                  "ml-auto size-5 transition-transform",
                  isCollapsed && "-rotate-90",
                )}
              />
            </button>

            {!isCollapsed && (
              <ul className="flex flex-col gap-2">
                {categoryItems.map((item) => {
                  return (
                    <li
                      key={item.id}
                      className="bg-card group flex items-center gap-2 rounded-xl border pr-2 shadow-xs"
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={item.isChecked}
                        onClick={() => handleToggle(item)}
                        className="flex min-w-0 items-center gap-5 py-4 pl-4 text-left"
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                            item.isChecked
                              ? "border-muted-foreground bg-muted-foreground text-background"
                              : "border-coral",
                          )}
                        >
                          {item.isChecked && (
                            <CheckIcon className="size-4" strokeWidth={3} />
                          )}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 text-base font-medium break-words",
                            item.isChecked && "text-muted-foreground",
                          )}
                        >
                          {item.name}
                        </span>
                      </button>
                      <QuantityEditor item={item} />
                      {/* Rest of the card also toggles, like tapping a
                          FamilyWall row (the checkbox button stays the
                          accessible control). */}
                      <div
                        aria-hidden
                        onClick={() => handleToggle(item)}
                        className="flex-1 cursor-pointer self-stretch"
                      />
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        aria-label={`Retirer ${item.name}`}
                        className="text-muted-foreground hover:text-destructive rounded-md p-2 transition-opacity focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Quantity shown after the name ("300 g"), editable in place. An item added
 * without quantity shows nothing, like in FamilyWall, except a discreet
 * "+ qté" on hover to set one.
 */
function QuantityEditor({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const label = formatItemQuantity(item);

  function save() {
    const quantity = Number(value);
    if (value === "" || quantity === item.quantity) {
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
          setValue(label ? String(item.quantity) : "");
          setEditing(true);
        }}
        aria-label={`Modifier la quantité de ${item.name}`}
        className={cn(
          "hover:bg-muted shrink-0 rounded-md px-1.5 py-1 text-base whitespace-nowrap",
          item.isChecked && "text-muted-foreground",
          !label &&
            "text-muted-foreground/70 text-sm transition-opacity focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
        )}
      >
        {label ? `— ${label}` : "+ qté"}
      </button>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-sm">
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
        className="border-input h-8 w-20 rounded-md border bg-transparent px-2"
        aria-label={`Quantité de ${item.name}`}
      />
      {shortUnitLabels[item.unit]}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </span>
  );
}
