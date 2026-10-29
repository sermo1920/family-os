"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PlusCircleIcon, SlidersHorizontalIcon } from "lucide-react";
import {
  addManualItem,
  type ShoppingListActionState,
} from "@/features/shopping-list/actions";
import { categoryLabels, unitLabels } from "@/features/ingredients/schema";
import type { KnownShoppingItem } from "@/features/shopping-list/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const initialState: ShoppingListActionState = { error: null };
const DATALIST_ID = "known-shopping-items";

/**
 * FamilyWall-style quick add: typing a name and pressing Enter is enough.
 * Category/quantity/unit live behind a "details" toggle — still submitted
 * when hidden, so values pre-filled from a known item are kept.
 */
export function AddManualItemForm({
  shoppingListId,
  knownItems,
}: {
  shoppingListId: string;
  knownItems: KnownShoppingItem[];
}) {
  const action = addManualItem.bind(null, shoppingListId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [showDetails, setShowDetails] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("GRAM");
  const nameInput = useRef<HTMLInputElement>(null);

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setName("");
      setCategory("OTHER");
      setQuantity("");
      setUnit("GRAM");
      // Keep the focus in the field to add several items in a row.
      nameInput.current?.focus();
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  function handleNameChange(value: string) {
    setName(value);
    const known = knownItems.find(
      (item) => item.name.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    if (known) {
      setCategory(known.category);
      // "1 piece" is what a quick add without quantity stores: leave the
      // field empty again rather than showing a "1" nobody typed.
      const isDefault = known.quantity === 1 && known.unit === "PIECE";
      setQuantity(isDefault ? "" : String(known.quantity));
      setUnit(known.unit);
    }
  }

  return (
    <form
      action={formAction}
      className="bg-card flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-xs"
    >
      <div className="flex items-center gap-4">
        <PlusCircleIcon
          className="text-muted-foreground size-6 shrink-0"
          strokeWidth={1.5}
        />
        <input
          ref={nameInput}
          name="name"
          placeholder="Nouvel article"
          aria-label="Nouvel article"
          list={DATALIST_ID}
          autoComplete="off"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none"
          required
        />
        <datalist id={DATALIST_ID}>
          {knownItems.map((item) => (
            <option key={item.name} value={item.name} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          aria-label="Catégorie et quantité"
          aria-pressed={showDetails}
          className={cn(
            "text-muted-foreground hover:text-foreground rounded-md p-1.5",
            showDetails && "bg-muted text-foreground",
          )}
        >
          <SlidersHorizontalIcon className="size-4" />
        </button>
        {name.trim() && (
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            className="bg-coral text-coral-foreground hover:bg-coral/90"
          >
            {pending ? "Ajout..." : "Ajouter"}
          </Button>
        )}
      </div>

      <div
        className={cn(
          "grid gap-2 border-t pt-3 sm:grid-cols-3",
          !showDetails && "hidden",
        )}
      >
        <Select
          name="category"
          value={category}
          onValueChange={(value) => setCategory(value as string)}
          items={categoryLabels}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          name="quantity"
          type="number"
          min={0}
          step="0.1"
          placeholder="Quantité (optionnel)"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Select
          name="unit"
          value={unit}
          onValueChange={(value) => setUnit(value as string)}
          items={unitLabels}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(unitLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
    </form>
  );
}
